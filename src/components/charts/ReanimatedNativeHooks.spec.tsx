import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import {Circle, Path} from '@shopify/react-native-skia';
import ChartAxisLabel from './ChartAxisLabel';
import ChartSelectionDot from './ChartSelectionDot';
import PaginationItem from '../pagination-dots/PaginationDots';

// Metro uses this source entrypoint; requireActual avoids type-checking the
// dependency's unrelated internal TypeScript as part of the app's test project.
const {AnimatedLineGraph} = jest.requireActual(
  'react-native-graph/src/AnimatedLineGraph',
);

// Render the actual chart components (including the patched dependency), while
// replacing native drawing/animation scheduling. This is not a native UI test.
const mockReactions = new Set<{
  prepare: () => unknown;
  react: (value: unknown, previous: unknown) => void;
  previous: unknown;
}>();
const mockPan = {isActive: {value: false}, x: {value: 0}, gesture: {}};

jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');
  const {View: NativeView} = require('react-native');
  const {interpolate} = jest.requireActual(
    'react-native-reanimated/src/interpolation',
  );
  return {
    __esModule: true,
    default: {View: NativeView, createAnimatedComponent: (value: any) => value},
    interpolate,
    Extrapolate: {CLAMP: 'clamp'},
    useSharedValue: (value: unknown) => ReactLib.useRef({value}).current,
    useAnimatedStyle: (updater: () => unknown, ...deps: unknown[]) => {
      expect(deps).toHaveLength(0);
      return updater();
    },
    useDerivedValue: (updater: () => unknown, ...deps: unknown[]) => {
      expect(deps).toHaveLength(0);
      return {
        get value() {
          return updater();
        },
      };
    },
    useAnimatedReaction: (
      prepare: () => unknown,
      react: (value: unknown, previous: unknown) => void,
      ...deps: unknown[]
    ) => {
      expect(deps).toHaveLength(0);
      ReactLib.useEffect(() => {
        const reaction = {prepare, react, previous: Symbol('initial')};
        mockReactions.add(reaction);
        return () => {
          mockReactions.delete(reaction);
        };
      });
    },
    runOnJS: (callback: unknown) => callback,
    cancelAnimation: jest.fn(),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
    withDelay: (_delay: number, value: number) => value,
    withSequence: (...values: number[]) => values[values.length - 1],
    withRepeat: (value: number) => value,
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const makePath = (commands: number[][] = []): any => ({
    moveTo: (...values: number[]) => commands.push([0, ...values]),
    lineTo: (...values: number[]) => commands.push([1, ...values]),
    cubicTo: (...values: number[]) => commands.push([4, ...values]),
    copy: () => makePath([...commands]),
    toCmds: () => commands,
    isInterpolatable: () => true,
    interpolate: () => makePath([...commands]),
  });
  return {
    Canvas: 'Canvas',
    Path: 'Path',
    Circle: 'Circle',
    Group: 'Group',
    Shadow: 'Shadow',
    LinearGradient: 'LinearGradient',
    PathVerb: {Move: 0, Cubic: 4},
    Skia: {Path: {Make: () => makePath()}},
    vec: (x: number, y: number) => ({x, y}),
    mix: (value: number, from: number, to: number) =>
      from + value * (to - from),
  };
});
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('react-native-graph/src/hooks/usePanGesture', () => ({
  usePanGesture: () => mockPan,
}));
jest.mock('styled-components/native', () => ({
  useTheme: () => ({dark: false}),
}));
jest.mock('../styled/Text', () => ({BaseText: require('react-native').Text}));
jest.mock('../../utils/helper-methods', () => ({
  formatFiatAmount: (value: number, currency: string) => `${currency} ${value}`,
}));

function flushReactions() {
  act(() => {
    for (const reaction of [...mockReactions]) {
      const value = reaction.prepare();
      if (!Object.is(value, reaction.previous)) {
        const previous = reaction.previous;
        reaction.previous = value;
        reaction.react(value, previous);
      }
    }
  });
}

describe('native Reanimated hook contract', () => {
  beforeEach(() => {
    mockReactions.clear();
    mockPan.isActive.value = false;
    mockPan.x.value = 0;
  });

  it('updates axis label opacity from numeric and shared inputs', () => {
    const props = {
      value: 10,
      index: 0,
      arrayLength: 2,
      width: 300,
      quoteCurrency: 'USD',
      type: 'max' as const,
    };
    const view = render(<ChartAxisLabel {...props} contentOpacity={0.25} />);
    const opacity = () =>
      StyleSheet.flatten(view.UNSAFE_getByType(Text).props.style).opacity;
    expect(opacity()).toBe(0.25);
    view.rerender(<ChartAxisLabel {...props} contentOpacity={0.75} />);
    expect(opacity()).toBe(0.75);
    const sharedOpacity = {value: 0.4} as any;
    view.rerender(<ChartAxisLabel {...props} contentOpacity={sharedOpacity} />);
    expect(opacity()).toBe(0.4);
    sharedOpacity.value = 0.9;
    view.rerender(<ChartAxisLabel {...props} contentOpacity={sharedOpacity} />);
    expect(opacity()).toBe(0.9);
  });

  it('opens and closes the selection dot from shared activation changes', () => {
    const isActive = {value: false} as any;
    const view = render(
      <ChartSelectionDot
        isActive={isActive}
        color="#123456"
        lineThickness={1}
        circleX={{value: 10} as any}
        circleY={{value: 20} as any}
      />,
    );
    const radii = () =>
      view.UNSAFE_getAllByType(Circle).map(node => node.props.r.value);
    flushReactions();
    expect(radii()).toEqual([0, 0]);
    isActive.value = true;
    flushReactions();
    expect(radii()).toEqual([9, 4]);
    isActive.value = false;
    flushReactions();
    expect(radii()).toEqual([0, 0]);
  });

  it('updates pagination positioning including wraparound', () => {
    const animValue = {value: 0} as any;
    const view = render(
      <PaginationItem index={0} length={3} animValue={animValue} />,
    );
    const position = () => {
      const animatedView = view
        .UNSAFE_getAllByType(View)
        .find(node => Array.isArray(node.props.style))!;
      return StyleSheet.flatten(animatedView.props.style).transform[0]
        .translateX;
    };
    expect(position()).toBe(0);
    animValue.value = 0.5;
    view.rerender(
      <PaginationItem index={0} length={3} animValue={animValue} />,
    );
    expect(position()).toBe(5);
    animValue.value = 2.5;
    view.rerender(
      <PaginationItem index={0} length={3} animValue={animValue} />,
    );
    expect(position()).toBe(-5);
  });

  it('keeps real graph paths and selection reactive after data and layout changes', () => {
    const points = [
      {date: new Date(0), value: 0},
      {date: new Date(1000), value: 100},
    ];
    const onPointSelected = jest.fn();
    const onGestureStart = jest.fn();
    const onGestureEnd = jest.fn();
    const props = {
      points,
      color: '#123456',
      gradientFillColors: ['#123456', '#ffffff'],
      enablePanGesture: true,
      onPointSelected,
      onGestureStart,
      onGestureEnd,
    };
    const view = render(<AnimatedLineGraph {...props} />);
    const layout = (width: number) => {
      const measured = view
        .UNSAFE_getAllByType(View)
        .find(node => typeof node.props.onLayout === 'function')!;
      fireEvent(measured, 'layout', {
        nativeEvent: {layout: {x: 0, y: 0, width, height: 200}},
      });
    };
    layout(300);
    flushReactions();
    const initialPath = view
      .UNSAFE_getAllByType(Path)[0]
      .props.path.value.toCmds();
    mockPan.isActive.value = true;
    mockPan.x.value = 150;
    flushReactions();
    expect(onPointSelected).toHaveBeenLastCalledWith(points[1]);
    expect(onGestureStart).toHaveBeenCalled();

    layout(600);
    flushReactions();
    expect(onPointSelected).toHaveBeenLastCalledWith(points[0]);
    const changedPoints = [
      {...points[0], value: 100},
      {...points[1], value: 0},
    ];
    view.rerender(<AnimatedLineGraph {...props} points={changedPoints} />);
    expect(
      view.UNSAFE_getAllByType(Path)[0].props.path.value.toCmds(),
    ).not.toEqual(initialPath);
    mockPan.isActive.value = false;
    flushReactions();
    expect(onGestureEnd).toHaveBeenCalled();
  });
});
