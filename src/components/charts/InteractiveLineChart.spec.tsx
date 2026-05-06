import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {View} from 'react-native';
import {ThemeProvider} from 'styled-components/native';
import InteractiveLineChart from './InteractiveLineChart';
import {SlateDark} from '../../styles/colors';
import {withTiming} from 'react-native-reanimated';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockLatestLineGraphProps: any;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');
  const {View: RNView} = require('react-native');
  const createAnimatedComponent = (component: unknown) => component;

  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent,
    },
    createAnimatedComponent,
    Easing: {
      cubic: jest.fn(),
      out: (value: unknown) => value,
    },
    useAnimatedProps: (fn: () => unknown) => fn(),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useDerivedValue: (fn: () => unknown) => ({value: fn()}),
    useSharedValue: (value: unknown) => ReactLib.useRef({value}).current,
    withTiming: jest.fn((value: unknown) => value),
  };
});

jest.mock('react-native-graph', () => {
  const ReactLib = require('react');
  return {
    LineGraph: (props: any) => {
      mockLatestLineGraphProps = props;
      return ReactLib.createElement('LineGraph', props);
    },
  };
});

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const {View: RNView} = require('react-native');
  const Svg = ({children, ...props}: any) =>
    ReactLib.createElement(RNView, props, children);

  return {
    __esModule: true,
    default: Svg,
    Line: (props: any) => ReactLib.createElement(RNView, props),
  };
});

jest.mock('../loader/Loader', () => () => null);

const theme = {
  dark: false,
  colors: {
    text: '#000000',
  },
};

const points = [
  {date: new Date(1_000), value: 100},
  {date: new Date(2_000), value: 105},
];
const invertedPoints = [
  {date: new Date(1_000), value: 105},
  {date: new Date(2_000), value: 100},
];

describe('InteractiveLineChart', () => {
  beforeEach(() => {
    mockLatestLineGraphProps = undefined;
    (withTiming as jest.Mock).mockClear();
  });

  it('passes a plain numeric line thickness to the static graph renderer', () => {
    act(() => {
      TestRenderer.create(
        <ThemeProvider theme={theme}>
          <View>
            <InteractiveLineChart
              points={points}
              color="#000000"
              gradientFillColors={['#ffffff', '#ffffff']}
              animated={false}
              strokeScale={{value: 0.5} as any}
            />
          </View>
        </ThemeProvider>,
      );
    });

    expect(mockLatestLineGraphProps?.animated).toBe(false);
    expect(typeof mockLatestLineGraphProps?.lineThickness).toBe('number');
    expect(mockLatestLineGraphProps?.lineThickness).toBe(4);
  });

  it('keeps dynamic stroke compensation on the animated graph renderer', () => {
    act(() => {
      TestRenderer.create(
        <ThemeProvider theme={theme}>
          <View>
            <InteractiveLineChart
              points={points}
              color="#000000"
              gradientFillColors={['#ffffff', '#ffffff']}
              animated
              strokeScale={{value: 0.5} as any}
            />
          </View>
        </ThemeProvider>,
      );
    });

    expect(mockLatestLineGraphProps?.animated).toBe(true);
    expect(mockLatestLineGraphProps?.lineThickness).toEqual(
      expect.objectContaining({
        value: expect.any(Number),
      }),
    );
  });

  it('waits until the first point guide line position is initialized before rendering it', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <View>
            <InteractiveLineChart
              points={points}
              color="#000000"
              gradientFillColors={['#ffffff', '#ffffff']}
              showFirstPointGuideLine
            />
          </View>
        </ThemeProvider>,
      );
    });

    expect(
      renderer.root.findAll(
        node =>
          node.props.stroke === SlateDark &&
          node.props.strokeLinecap === 'butt',
      ),
    ).toHaveLength(0);

    act(() => {
      renderer.root.findByType('LineGraph').props.onLayout({
        nativeEvent: {layout: {x: 0, y: 10, width: 300, height: 200}},
      });
    });

    const guideLines = renderer.root.findAll(
      node =>
        node.props.stroke === SlateDark && node.props.strokeLinecap === 'butt',
    );
    expect(guideLines.length).toBeGreaterThan(0);

    const guideLineContainer = renderer.root.findAll(node => {
      const style = node.props.style;
      return (
        node.props.pointerEvents === 'none' &&
        Array.isArray(style) &&
        style.some(
          styleItem =>
            styleItem &&
            styleItem.position === 'absolute' &&
            styleItem.height === 4,
        )
      );
    })[0];
    expect(guideLineContainer?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({top: 204})]),
    );
  });

  it('keeps the first point guide line hidden while the graph line is hidden for loading', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <View>
            <InteractiveLineChart
              points={points}
              color="#000000"
              gradientFillColors={['#ffffff', '#ffffff']}
              showFirstPointGuideLine
              isLoading
              hideLineWhileLoading
            />
          </View>
        </ThemeProvider>,
      );
    });

    act(() => {
      renderer.root.findByType('LineGraph').props.onLayout({
        nativeEvent: {layout: {x: 0, y: 10, width: 300, height: 200}},
      });
    });

    expect(
      renderer.root.findAll(
        node =>
          node.props.stroke === SlateDark &&
          node.props.strokeLinecap === 'butt',
      ),
    ).toHaveLength(0);
  });

  it('animates the first point guide line between computed chart positions', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    const renderChart = (chartPoints: typeof points) => (
      <ThemeProvider theme={theme}>
        <View>
          <InteractiveLineChart
            points={chartPoints}
            color="#000000"
            gradientFillColors={['#ffffff', '#ffffff']}
            showFirstPointGuideLine
          />
        </View>
      </ThemeProvider>
    );

    act(() => {
      renderer = TestRenderer.create(renderChart(points));
    });

    act(() => {
      renderer.root.findByType('LineGraph').props.onLayout({
        nativeEvent: {layout: {x: 0, y: 10, width: 300, height: 200}},
      });
    });

    expect(withTiming).not.toHaveBeenCalled();

    act(() => {
      renderer.update(renderChart(invertedPoints));
    });

    expect(withTiming).toHaveBeenCalledWith(
      -192,
      expect.objectContaining({duration: 260}),
    );

    const guideLineContainer = renderer.root.findAll(node => {
      const style = node.props.style;
      return (
        node.props.pointerEvents === 'none' &&
        Array.isArray(style) &&
        style.some(
          styleItem =>
            styleItem &&
            styleItem.position === 'absolute' &&
            styleItem.height === 4,
        )
      );
    })[0];
    expect(guideLineContainer?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({top: 204})]),
    );
  });
});
