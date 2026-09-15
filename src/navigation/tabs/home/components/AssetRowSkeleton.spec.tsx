import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

jest.unmock('react-native-skeleton-placeholder');

// Render the real dependency; replace only the platform drawing components.
jest.mock('@react-native-masked-view/masked-view', () => {
  const MockReact = require('react');
  const NativeView = require('react-native').View;
  return ({children, maskElement, ...props}: any) =>
    MockReact.createElement(
      NativeView,
      {...props, testID: 'skeleton-mask'},
      maskElement,
      children,
    );
});

jest.mock('react-native-linear-gradient', () => {
  const MockReact = require('react');
  const NativeView = require('react-native').View;
  return (props: any) =>
    MockReact.createElement(NativeView, {
      ...props,
      testID: 'skeleton-gradient',
    });
});

function renderLaidOutSkeleton(shimmerWidth?: number, speed = 800) {
  const view = render(
    <SkeletonPlaceholder
      shimmerWidth={shimmerWidth}
      speed={speed}
      backgroundColor="#E1E9EE"
      highlightColor="#F2F8FC">
      <SkeletonPlaceholder.Item width={120} height={20} borderRadius={2} />
    </SkeletonPlaceholder>,
  );
  const measurementView = view
    .UNSAFE_getAllByType(View)
    .find(node => typeof node.props.onLayout === 'function');
  expect(measurementView).toBeDefined();
  fireEvent(measurementView!, 'layout', {
    nativeEvent: {layout: {x: 0, y: 0, width: 120, height: 20}},
  });
  return view;
}

describe('AssetRow skeleton dependency geometry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([undefined, 64])(
    'absolutely fills both shimmer layers after layout (shimmerWidth: %s)',
    shimmerWidth => {
      const view = renderLaidOutSkeleton(shimmerWidth);
      const wrapperStyle = StyleSheet.flatten(
        view.UNSAFE_getByType(Animated.View).props.style,
      );
      const gradient = view.getByTestId('skeleton-gradient');
      const gradientStyle = StyleSheet.flatten(gradient.props.style);
      const fill = {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0};

      expect(wrapperStyle).toMatchObject(fill);
      expect(gradientStyle).toMatchObject(fill);
      expect(wrapperStyle.transform).toEqual([{translateX: expect.anything()}]);
      expect(gradientStyle.width).toBe(shimmerWidth);
      expect(gradient.props.colors).toEqual([
        '#F2F8FC00',
        '#F2F8FC',
        '#F2F8FC00',
      ]);
      expect(
        StyleSheet.flatten(view.getByTestId('skeleton-mask').props.style),
      ).toMatchObject({width: 120, height: 20});
    },
  );

  it('retains the native-driver animation loop and stops it on unmount', () => {
    const timing = jest.spyOn(Animated, 'timing');
    const loop = jest.spyOn(Animated, 'loop');
    const view = renderLaidOutSkeleton(64, 400);
    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    );
    expect(loop).toHaveBeenCalledTimes(1);
    const stop = jest.spyOn(loop.mock.results[0].value, 'stop');
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
