import React from 'react';
import {View} from 'react-native';
import {render} from '@test/render';
import Loader from './Loader';

// LoaderSvg relies on @shopify/react-native-skia APIs (MakeFromSVGString, Matrix,
// SweepGradient, vec) that are not fully covered by the global Skia mock.
// Stub it out so Loader's own animation logic is the focus of these tests.
jest.mock('./LoaderSvg', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({size}: {size?: number}) => (
    <View testID="loader-svg" style={{width: size, height: size}} />
  );
});

describe('Loader', () => {
  it('renders without crashing with default props', () => {
    const {toJSON} = render(<Loader />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the inner LoaderSvg', () => {
    const {getByTestId} = render(<Loader />);
    expect(getByTestId('loader-svg')).toBeTruthy();
  });

  it('passes the default size (32) to LoaderSvg', () => {
    const {getByTestId} = render(<Loader />);
    const svg = getByTestId('loader-svg');
    expect(svg.props.style).toMatchObject({width: 32, height: 32});
  });

  it('passes a custom size to LoaderSvg', () => {
    const {getByTestId} = render(<Loader size={64} />);
    const svg = getByTestId('loader-svg');
    expect(svg.props.style).toMatchObject({width: 64, height: 64});
  });

  it('renders when spinning is true (default)', () => {
    const {getByTestId} = render(<Loader spinning={true} />);
    expect(getByTestId('loader-svg')).toBeTruthy();
  });

  it('renders when spinning is false (animation stopped)', () => {
    const {getByTestId} = render(<Loader spinning={false} />);
    expect(getByTestId('loader-svg')).toBeTruthy();
  });

  it('applies a custom style to the wrapping Animated.View', () => {
    const customStyle = {margin: 10};
    const {toJSON} = render(<Loader style={customStyle} />);
    const tree = toJSON() as any;
    // The outermost element should include the custom style
    const styles = Array.isArray(tree?.props?.style)
      ? tree.props.style
      : [tree?.props?.style];
    const hasCustomMargin = styles.some((s: any) => s && s.margin === 10);
    expect(hasCustomMargin).toBe(true);
  });

  it('transitions from spinning to not spinning without crashing', () => {
    const {rerender, getByTestId} = render(<Loader spinning={true} />);
    rerender(<Loader spinning={false} />);
    expect(getByTestId('loader-svg')).toBeTruthy();
  });

  it('renders with a custom durationMs', () => {
    const {getByTestId} = render(<Loader durationMs={300} />);
    expect(getByTestId('loader-svg')).toBeTruthy();
  });
});
