import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {render} from '@test/render';
import ButtonOverlay from './ButtonOverlay';
import Button, {BUTTON_RADIUS, PILL_RADIUS} from './Button';

const getFlattenedOverlayStyle = (
  overlay: ReturnType<ReturnType<typeof render>['getByTestId']>,
) => StyleSheet.flatten(overlay.props.style);

describe('ButtonOverlay', () => {
  it('renders without crashing when not visible', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={false}
        buttonStyle="primary"
        buttonType="button"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing when visible', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="button"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders children when provided', () => {
    const {getByText} = render(
      <ButtonOverlay isVisible={true} buttonStyle="primary" buttonType="button">
        <Text>Overlay Child</Text>
      </ButtonOverlay>,
    );
    expect(getByText('Overlay Child')).toBeTruthy();
  });

  it('renders with pill buttonType', () => {
    const {getByTestId} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="pill"
      />,
    );
    expect(
      getFlattenedOverlayStyle(getByTestId('button-overlay')),
    ).toMatchObject({borderRadius: PILL_RADIUS});
  });

  it('renders with link buttonType', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="link"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with secondary buttonStyle', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="secondary"
        buttonType="button"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with a custom backgroundColor', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="button"
        backgroundColor="#00FF00"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with animate=true', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="button"
        animate
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with animate=false', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={false}
        buttonStyle="primary"
        buttonType="button"
        animate={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('transitions from visible to not visible without crashing', () => {
    const {rerender, toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="button"
      />,
    );
    rerender(
      <ButtonOverlay
        isVisible={false}
        buttonStyle="primary"
        buttonType="button"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('is absolutely positioned and noninteractive when hidden', () => {
    const {getByTestId} = render(
      <ButtonOverlay
        isVisible={false}
        buttonStyle="primary"
        buttonType="button"
      />,
    );
    const overlay = getByTestId('button-overlay');
    const flattenedStyle = getFlattenedOverlayStyle(overlay);

    expect(overlay.props.pointerEvents).toBe('none');
    expect(flattenedStyle).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderRadius: BUTTON_RADIUS,
      opacity: 0,
    });
  });

  it('keeps every shared Button overlay out of flex layout', () => {
    const {getAllByTestId} = render(<Button>Continue</Button>);
    const overlays = getAllByTestId('button-overlay');

    expect(overlays).toHaveLength(3);
    overlays.forEach(overlay => {
      expect(overlay.props.pointerEvents).toBe('none');
      expect(getFlattenedOverlayStyle(overlay)).toMatchObject({
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      });
    });
  });
});
