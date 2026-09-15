import React from 'react';
import {Text} from 'react-native';
import {act, render} from '@testing-library/react-native';
import Modal from 'react-native-modal';

const mockAnimations: Array<() => void> = [];
const mockAnimate = jest.fn(
  () => new Promise<void>(resolve => mockAnimations.push(resolve)),
);
const mockTransition = jest.fn();

// Only the animation/native-view boundary is mocked. The modal's actual
// mount/update/open/close lifecycle and completion callbacks run unchanged.
jest.mock('react-native-animatable', () => {
  const actual = jest.requireActual('react-native-animatable');
  const ReactMock = require('react');
  const {View} = require('react-native');
  return {
    ...actual,
    View: ReactMock.forwardRef((props: any, ref: any) => {
      ReactMock.useImperativeHandle(ref, () => ({
        animate: mockAnimate,
        transitionTo: mockTransition,
        stopAnimation: jest.fn(),
      }));
      return <View {...props} />;
    }),
  };
});

const finishAnimation = async () => {
  await act(async () => {
    const finish = mockAnimations.shift();
    expect(finish).toBeDefined();
    finish!();
  });
};

describe('real react-native-modal lifecycle on RN 0.87', () => {
  beforeEach(() => {
    mockAnimations.length = 0;
    mockAnimate.mockClear();
    mockTransition.mockClear();
  });

  it('opens, closes after animation, and reopens without InteractionManager', async () => {
    const onModalShow = jest.fn();
    const onModalHide = jest.fn();
    const modal = (isVisible: boolean) => (
      <Modal
        isVisible={isVisible}
        onModalShow={onModalShow}
        onModalHide={onModalHide}>
        <Text>Modal content</Text>
      </Modal>
    );
    const {rerender} = render(modal(false));
    expect(mockAnimate).not.toHaveBeenCalled();
    rerender(modal(true));
    expect(mockAnimate).toHaveBeenLastCalledWith('slideInUp', 300);
    expect(onModalShow).not.toHaveBeenCalled();
    await finishAnimation();
    expect(onModalShow).toHaveBeenCalledTimes(1);
    rerender(modal(false));
    expect(mockAnimate).toHaveBeenLastCalledWith('slideOutDown', 300);
    expect(onModalHide).not.toHaveBeenCalled();
    await finishAnimation();
    expect(onModalHide).toHaveBeenCalledTimes(1);
    rerender(modal(true));
    await finishAnimation();
    expect(onModalShow).toHaveBeenCalledTimes(2);
    expect(mockTransition).toHaveBeenCalledWith({opacity: 0.7}, 300);
    expect(mockTransition).toHaveBeenCalledWith({opacity: 0}, 300);
  });

  it('completes a close requested during initial presentation', async () => {
    const onModalHide = jest.fn();
    const modal = (isVisible: boolean) => (
      <Modal isVisible={isVisible} onModalHide={onModalHide}>
        <Text>Initial modal</Text>
      </Modal>
    );
    const {rerender} = render(modal(true));
    rerender(modal(false));
    expect(mockAnimate).toHaveBeenCalledTimes(1);
    await finishAnimation();
    expect(mockAnimate).toHaveBeenCalledTimes(2);
    await finishAnimation();
    expect(onModalHide).toHaveBeenCalledTimes(1);
  });
});
