import React from 'react';
import {fireEvent, render} from '@test/render';
import FeatureCard from './FeatureCard';

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return ({children, ...rest}: any) => <View {...rest}>{children}</View>;
});

const defaultProps = {
  image: {uri: 'https://example.com/image.png'},
  descriptionTitle: 'Test Feature Title',
  descriptionText: 'This is a description of the feature.',
  ctaText: 'Learn More',
  cta: jest.fn(),
};

describe('FeatureCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the description title', () => {
    const {getByText} = render(<FeatureCard {...defaultProps} />);
    expect(getByText('Test Feature Title')).toBeTruthy();
  });

  it('renders the description text', () => {
    const {getByText} = render(<FeatureCard {...defaultProps} />);
    expect(getByText('This is a description of the feature.')).toBeTruthy();
  });

  it('renders the CTA button element', () => {
    // The Button renders with a testID even when the gesture-handler mock
    // does not expose inner text children in the test environment
    const {getByTestId} = render(<FeatureCard {...defaultProps} />);
    expect(getByTestId('button')).toBeTruthy();
  });

  it('calls cta when the CTA button is pressed', () => {
    const cta = jest.fn();
    const {getByTestId} = render(<FeatureCard {...defaultProps} cta={cta} />);
    fireEvent(getByTestId('button'), 'press');
    expect(cta).toHaveBeenCalledTimes(1);
  });

  it('does not call cta when a different cta function is used', () => {
    const cta = jest.fn();
    const otherCta = jest.fn();
    const {getByTestId} = render(
      <FeatureCard {...defaultProps} cta={cta} />,
    );
    fireEvent(getByTestId('button'), 'press');
    expect(cta).toHaveBeenCalledTimes(1);
    expect(otherCta).not.toHaveBeenCalled();
  });

  it('renders different title and description text props', () => {
    const {getByText} = render(
      <FeatureCard
        {...defaultProps}
        descriptionTitle="Secure Your Wallet"
        descriptionText="Keep your crypto safe with our advanced security."
      />,
    );
    expect(getByText('Secure Your Wallet')).toBeTruthy();
    expect(getByText('Keep your crypto safe with our advanced security.')).toBeTruthy();
  });

  it('calls the correct cta after re-render with a new cta prop', () => {
    const firstCta = jest.fn();
    const secondCta = jest.fn();
    const {getByTestId, rerender} = render(
      <FeatureCard {...defaultProps} cta={firstCta} />,
    );
    rerender(<FeatureCard {...defaultProps} cta={secondCta} />);
    fireEvent(getByTestId('button'), 'press');
    expect(secondCta).toHaveBeenCalledTimes(1);
    expect(firstCta).not.toHaveBeenCalled();
  });
});
