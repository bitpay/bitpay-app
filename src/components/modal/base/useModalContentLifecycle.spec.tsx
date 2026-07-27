import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {act, fireEvent, render} from '@test/render';
import useModalContentLifecycle from './useModalContentLifecycle';

const LifecycleHarness = ({isVisible}: {isVisible: boolean}) => {
  const {shouldRenderModal, handleModalHide} =
    useModalContentLifecycle(isVisible);

  return shouldRenderModal ? (
    <View testID="modal-content">
      <TouchableOpacity testID="modal-hide" onPress={handleModalHide} />
    </View>
  ) : null;
};

describe('useModalContentLifecycle', () => {
  it('keeps content mounted until the modal reports that it finished hiding', () => {
    const {getByTestId, queryByTestId, rerender} = render(
      <LifecycleHarness isVisible={false} />,
    );

    expect(queryByTestId('modal-content')).toBeNull();

    rerender(<LifecycleHarness isVisible />);
    expect(getByTestId('modal-content')).toBeTruthy();

    rerender(<LifecycleHarness isVisible={false} />);
    expect(getByTestId('modal-content')).toBeTruthy();

    fireEvent.press(getByTestId('modal-hide'));
    expect(queryByTestId('modal-content')).toBeNull();
  });

  it('does not unmount content that reopened during its close animation', () => {
    const {getByTestId, rerender} = render(
      <LifecycleHarness isVisible={false} />,
    );

    rerender(<LifecycleHarness isVisible />);
    rerender(<LifecycleHarness isVisible={false} />);
    rerender(<LifecycleHarness isVisible />);

    act(() => {
      fireEvent.press(getByTestId('modal-hide'));
    });

    expect(getByTestId('modal-content')).toBeTruthy();
  });
});
