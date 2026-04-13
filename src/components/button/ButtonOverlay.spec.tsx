import React from 'react';
import {Text} from 'react-native';
import {render} from '@test/render';
import ButtonOverlay from './ButtonOverlay';

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
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="button">
        <Text>Overlay Child</Text>
      </ButtonOverlay>,
    );
    expect(getByText('Overlay Child')).toBeTruthy();
  });

  it('renders with pill buttonType', () => {
    const {toJSON} = render(
      <ButtonOverlay
        isVisible={true}
        buttonStyle="primary"
        buttonType="pill"
      />,
    );
    expect(toJSON()).toBeTruthy();
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
});
