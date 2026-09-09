import React, {useEffect} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {act, render, waitFor} from '@test/render';
import SheetModal from './SheetModal';
import BaseModal from '../BaseModal';

jest.mock('../BaseModal', () => {
  const ReactLib = require('react');
  return {
    __esModule: true,
    default: ({children}: {children?: React.ReactNode}) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
  };
});

jest.mock('../../../blur/Blur', () => ({
  BlurContainer: () => null,
}));

const SheetContent = ({
  onMount,
  onUnmount,
}: {
  onMount?: () => void;
  onUnmount?: () => void;
}) => {
  useEffect(() => {
    onMount?.();
    return () => onUnmount?.();
  }, [onMount, onUnmount]);

  return <View testID="sheet-content" />;
};

describe('SheetModal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not mount bottom-sheet children while hidden', () => {
    const onMount = jest.fn();
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');

    const {queryByTestId} = render(
      <SheetModal
        isVisible={false}
        modalLibrary="bottom-sheet"
        onBackdropPress={jest.fn()}>
        <SheetContent onMount={onMount} />
      </SheetModal>,
    );

    expect(queryByTestId('sheet-content')).toBeNull();
    expect(onMount).not.toHaveBeenCalled();
    expect(presentSpy).not.toHaveBeenCalled();
  });

  it('mounts bottom-sheet children before presenting it', async () => {
    const onMount = jest.fn();
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const onBackdropPress = jest.fn();

    const {queryByTestId, rerender} = render(
      <SheetModal
        isVisible={false}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent onMount={onMount} />
      </SheetModal>,
    );

    rerender(
      <SheetModal
        isVisible={true}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent onMount={onMount} />
      </SheetModal>,
    );

    await waitFor(() => {
      expect(queryByTestId('sheet-content')).toBeTruthy();
      expect(onMount).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
  });

  it('keeps children mounted while closing and unmounts them on dismiss', async () => {
    const onUnmount = jest.fn();
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismissSpy = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const onBackdropPress = jest.fn();

    const {queryByTestId, rerender, UNSAFE_getByType} = render(
      <SheetModal
        isVisible={true}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent onUnmount={onUnmount} />
      </SheetModal>,
    );

    await waitFor(() => expect(queryByTestId('sheet-content')).toBeTruthy());
    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onAnimate(-1, 0, 0, 100);
    });

    rerender(
      <SheetModal
        isVisible={false}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent onUnmount={onUnmount} />
      </SheetModal>,
    );

    await waitFor(() => expect(dismissSpy).toHaveBeenCalledTimes(1));
    expect(queryByTestId('sheet-content')).toBeTruthy();
    expect(onUnmount).not.toHaveBeenCalled();

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onDismiss();
    });

    expect(queryByTestId('sheet-content')).toBeNull();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });

  it('reopens after an in-progress dismiss without remounting children', async () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismissSpy = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 0;
    });
    const onBackdropPress = jest.fn();

    const renderModal = (isVisible: boolean) => (
      <SheetModal
        isVisible={isVisible}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent onMount={onMount} onUnmount={onUnmount} />
      </SheetModal>
    );

    const {queryByTestId, rerender, UNSAFE_getByType} = render(
      renderModal(true),
    );

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onAnimate(-1, 0, 0, 100);
    });
    rerender(renderModal(false));
    await waitFor(() => expect(dismissSpy).toHaveBeenCalledTimes(1));
    rerender(renderModal(true));

    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(queryByTestId('sheet-content')).toBeTruthy();

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onDismiss();
    });

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(2));
    expect(queryByTestId('sheet-content')).toBeTruthy();
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();
  });

  it('waits for a pending presentation before dismissing', async () => {
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismissSpy = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const onBackdropPress = jest.fn();
    const renderModal = (isVisible: boolean) => (
      <SheetModal
        isVisible={isVisible}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent />
      </SheetModal>
    );
    const {rerender, UNSAFE_getByType} = render(renderModal(true));

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
    rerender(renderModal(false));

    expect(dismissSpy).not.toHaveBeenCalled();

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onAnimate(-1, 0, 0, 100);
    });

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending dismiss when the sheet reopens before presentation', async () => {
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismissSpy = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const onBackdropPress = jest.fn();
    const renderModal = (isVisible: boolean) => (
      <SheetModal
        isVisible={isVisible}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent />
      </SheetModal>
    );
    const {rerender, UNSAFE_getByType} = render(renderModal(true));

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
    rerender(renderModal(false));
    rerender(renderModal(true));

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onAnimate(-1, 0, 0, 100);
    });

    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(dismissSpy).not.toHaveBeenCalled();
  });

  it('uses the bottom-sheet change event as a presentation fallback', async () => {
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismissSpy = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const onBackdropPress = jest.fn();
    const renderModal = (isVisible: boolean) => (
      <SheetModal
        isVisible={isVisible}
        modalLibrary="bottom-sheet"
        onBackdropPress={onBackdropPress}>
        <SheetContent />
      </SheetModal>
    );
    const {rerender, UNSAFE_getByType} = render(renderModal(true));

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
    rerender(renderModal(false));

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onChange(0, 100, 0);
    });

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it('lazily mounts opted-in modal children and removes them after hiding', async () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
    const onBackdropPress = jest.fn();
    const renderModal = (isVisible: boolean) => (
      <SheetModal
        isVisible={isVisible}
        unmountContentWhenHidden
        onBackdropPress={onBackdropPress}>
        <SheetContent onMount={onMount} onUnmount={onUnmount} />
      </SheetModal>
    );
    const {queryByTestId, rerender, UNSAFE_getByType} = render(
      renderModal(false),
    );

    expect(queryByTestId('sheet-content')).toBeNull();
    expect(onMount).not.toHaveBeenCalled();

    rerender(renderModal(true));
    await waitFor(() => expect(queryByTestId('sheet-content')).toBeTruthy());
    expect(onMount).toHaveBeenCalledTimes(1);

    rerender(renderModal(false));
    expect(queryByTestId('sheet-content')).toBeTruthy();

    act(() => {
      UNSAFE_getByType(BaseModal).props.onModalHide();
    });

    expect(queryByTestId('sheet-content')).toBeNull();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });
});
