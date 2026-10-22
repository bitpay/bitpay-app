import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';
import ChartAxisLabel from './ChartAxisLabel';
import {ThemeProvider} from '../../contexts';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockState: any;

jest.mock('../../utils/hooks', () => ({
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
}));

jest.mock('../../utils/helper-methods', () => ({
  formatFiatAmount: jest.fn(() => '$1,240.00'),
}));

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const createAnimatedComponent = (component: unknown) => component;
  return {
    __esModule: true,
    default: {View, createAnimatedComponent},
    createAnimatedComponent,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (value: unknown) => ({value}),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    View,
  };
});

const testTheme = {
  dark: false,
  colors: {text: '#000000'},
} as any;

const renderAxisLabel = (maskWhenBalancesHidden: boolean) => {
  let view!: TestRenderer.ReactTestRenderer;
  act(() => {
    view = TestRenderer.create(
      <ThemeProvider theme={testTheme}>
        <ChartAxisLabel
          value={1240}
          index={0}
          arrayLength={2}
          width={300}
          quoteCurrency={'USD'}
          type={'max'}
          maskWhenBalancesHidden={maskWhenBalancesHidden}
        />
      </ThemeProvider>,
    );
  });

  return view.root
    .findAllByType(Text)
    .flatMap(node => node.props.children)
    .filter(child => typeof child === 'string');
};

describe('ChartAxisLabel', () => {
  beforeEach(() => {
    mockState = {APP: {hideAllBalances: false}};
  });

  it('renders the fiat value when balances are not hidden', () => {
    expect(renderAxisLabel(true)).toContain('$1,240.00');
  });

  it('masks the fiat value while balances are hidden', () => {
    mockState.APP.hideAllBalances = true;

    const labels = renderAxisLabel(true);
    expect(labels).toContain('****');
    expect(labels).not.toContain('$1,240.00');
  });

  it('keeps price labels visible while balances are hidden', () => {
    mockState.APP.hideAllBalances = true;

    expect(renderAxisLabel(false)).toContain('$1,240.00');
  });
});
