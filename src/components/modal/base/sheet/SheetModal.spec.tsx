import React from 'react';
import {AppState} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {act, render, waitFor} from '@test/render';
import SheetModal from './SheetModal';

describe('SheetModal', () => {
  const renderSheet = (onBackdropPress = () => {}) => {
    const tree = (isVisible: boolean) => (
      <SheetModal
        modalLibrary={'bottom-sheet'}
        isVisible={isVisible}
        enableBackdropDismiss={true}
        onBackdropPress={onBackdropPress}>
        <></>
      </SheetModal>
    );

    const utils = render(tree(false));
    act(() => {
      utils.rerender(tree(true));
    });

    return {...utils, tree};
  };

  let present: jest.SpyInstance;
  let dismiss: jest.SpyInstance;

  beforeEach(() => {
    present = jest.spyOn(BottomSheetModal.prototype, 'present');
    dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('presents a lazily mounted bottom sheet that is initially visible', async () => {
    const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');

    render(
      <SheetModal
        isVisible={true}
        modalLibrary="bottom-sheet"
        onBackdropPress={jest.fn()}>
        <></>
      </SheetModal>,
    );

    await waitFor(() => expect(presentSpy).toHaveBeenCalledTimes(1));
  });

  it('dismisses the sheet when isVisible flips to false', () => {
    const {rerender, tree} = renderSheet();
    expect(present).toHaveBeenCalledTimes(1);

    act(() => {
      rerender(tree(false));
    });

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses the sheet when backgrounded, not just its content', () => {
    let onAppStateChange: (status: string) => void = () => {};
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event: any, handler: any) => {
        onAppStateChange = handler;
        return {remove: () => {}} as any;
      });

    // onBackdropPress is what flips redux visibility off, as BottomNotification does
    const {rerender, tree} = renderSheet(() => rerender(tree(false)));
    expect(present).toHaveBeenCalledTimes(1);

    act(() => {
      onAppStateChange('background');
    });

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
