import React from 'react';
import {AccessibilityInfo, StyleSheet} from 'react-native';
import {cancelAnimation, withRepeat} from 'react-native-reanimated';
import {fireEvent, render} from '@test/render';
import BalanceChartSkeleton, {
  BalanceChartErrorCaption,
  BalanceChartPopulateCaption,
  GHOST_COLOR_DARK,
} from './BalanceChartSkeleton';
import {ThemeProvider} from '../../contexts';
import {BitPayDarkTheme} from '../../themes/bitpay';
import {Slate} from '../../styles/colors';
import BalanceChartLoadingPlaceholder, {
  BALANCE_CHART_LOADING_PLACEHOLDER_HEIGHT,
} from './BalanceChartLoadingPlaceholder';

let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
    withRepeat: jest.fn((animation: unknown) => animation),
    cancelAnimation: jest.fn(),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name: string) =>
        String(options?.[name]),
      ),
  }),
}));

const layout = (node: any, width = 340) =>
  fireEvent(node, 'layout', {
    nativeEvent: {layout: {x: 0, y: 0, width, height: 220}},
  });

const findGhostLine = (container: any) =>
  container.findAll(
    (node: any) => node.type === 'Path' && node.props.style === 'stroke',
  )[0];

describe('BalanceChartSkeleton', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    (withRepeat as jest.Mock).mockClear();
    (cancelAnimation as jest.Mock).mockClear();
  });

  it('renders a fixed-height frame announced as a loading progressbar', () => {
    const {getByTestId, getByRole} = render(<BalanceChartSkeleton />);

    expect(
      StyleSheet.flatten(getByTestId('balance-chart-skeleton').props.style),
    ).toEqual(expect.objectContaining({height: 220}));
    const progressbar = getByRole('progressbar');
    expect(progressbar.props.accessibilityLabel).toBe(
      'Loading balance history',
    );
    expect(progressbar.props.accessibilityState).toEqual({busy: true});
  });

  it('draws the ghost line with a looping Skia trim driven by a shared value', () => {
    const {getByTestId, container, unmount} = render(<BalanceChartSkeleton />);
    layout(getByTestId('balance-chart-skeleton'));

    const ghostLine = findGhostLine(container);
    expect(ghostLine).toBeDefined();
    expect(ghostLine.props.start).toBe(0);
    // `end` is a Reanimated shared value, so the draw runs on the UI thread.
    expect(ghostLine.props.end).toEqual(
      expect.objectContaining({value: expect.any(Number)}),
    );
    // Infinite, non-reversing loops (draw progress + hold/fade opacity). The
    // jest mock's useSharedValue is not referentially stable, so the effect
    // can restart after layout; only the loop shape is asserted here.
    expect(withRepeat).toHaveBeenCalled();
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1, false);

    const cancelCallsBeforeUnmount = (cancelAnimation as jest.Mock).mock.calls
      .length;
    unmount();
    expect((cancelAnimation as jest.Mock).mock.calls.length).toBeGreaterThan(
      cancelCallsBeforeUnmount,
    );
  });

  it('holds a fully drawn static line when reduced motion is enabled', () => {
    mockReducedMotion = true;
    const {getByTestId, getByRole, container} = render(
      <BalanceChartSkeleton />,
    );
    layout(getByTestId('balance-chart-skeleton'));

    expect(withRepeat).not.toHaveBeenCalled();
    expect(findGhostLine(container).props.end.value).toBe(1);
    // Still announced as loading.
    expect(getByRole('progressbar')).toBeTruthy();
  });

  it('does not animate or announce loading in the static error variant', () => {
    const onRetry = jest.fn();
    const {getByTestId, queryByRole, getByText, getByRole, container} = render(
      <BalanceChartSkeleton
        variant="static"
        isLoading={false}
        caption={<BalanceChartErrorCaption onRetry={onRetry} />}
      />,
    );
    layout(getByTestId('balance-chart-skeleton'));

    expect(withRepeat).not.toHaveBeenCalled();
    expect(findGhostLine(container).props.end.value).toBe(1);
    expect(queryByRole('progressbar')).toBeNull();
    expect(getByText("Couldn't load balance history.")).toBeTruthy();

    const retryButton = getByRole('button');
    expect(retryButton.props.accessibilityLabel).toBe('Retry');
    fireEvent.press(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses Slate on light and the dimmer mock-up slate on dark', () => {
    const light = render(<BalanceChartSkeleton />);
    layout(light.getByTestId('balance-chart-skeleton'));
    expect(findGhostLine(light.container).props.color).toBe(Slate);

    const dark = render(
      <ThemeProvider theme={BitPayDarkTheme}>
        <BalanceChartSkeleton />
      </ThemeProvider>,
    );
    layout(dark.getByTestId('balance-chart-skeleton'));
    expect(findGhostLine(dark.container).props.color).toBe(GHOST_COLOR_DARK);
  });

  it('announces the load failure to screen readers when the error caption appears', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);

    render(
      <BalanceChartSkeleton
        variant="static"
        isLoading={false}
        caption={<BalanceChartErrorCaption onRetry={jest.fn()} />}
      />,
    );

    expect(announce).toHaveBeenCalledWith("Couldn't load balance history.");
    announce.mockRestore();
  });

  it('renders the populate caption with interpolated wallet counts', () => {
    const {getByText} = render(
      <BalanceChartSkeleton
        caption={<BalanceChartPopulateCaption completed={2} total={7} />}
      />,
    );

    expect(getByText('Updating history · 2 of 7 wallets')).toBeTruthy();
  });
});

describe('BalanceChartLoadingPlaceholder', () => {
  it('keeps the 259px chart + selector footprint and shows populate counts', () => {
    const {getByTestId, getByText, getByRole} = render(
      <BalanceChartLoadingPlaceholder
        populateProgress={{completed: 3, total: 5}}
      />,
    );

    expect(
      StyleSheet.flatten(getByTestId('balance-chart-skeleton').props.style),
    ).toEqual(
      expect.objectContaining({
        height: BALANCE_CHART_LOADING_PLACEHOLDER_HEIGHT,
      }),
    );
    expect(getByRole('progressbar')).toBeTruthy();
    expect(getByText('Updating history · 3 of 5 wallets')).toBeTruthy();
  });

  it('falls back to the bare skeleton when counts are unknown', () => {
    const {queryByTestId} = render(<BalanceChartLoadingPlaceholder />);

    expect(queryByTestId('balance-chart-populate-caption')).toBeNull();
  });
});
