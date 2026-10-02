import React from 'react';
import {AppState} from 'react-native';
import {act, render} from '@testing-library/react-native';
import {ThemeProvider} from 'styled-components/native';
import {BitPayDarkTheme} from '../../../../themes/bitpay';
import SheetModal from './SheetModal';

const {BottomSheetModal} = require('@gorhom/bottom-sheet');

describe('SheetModal', () => {
  const renderSheet = (onBackdropPress = () => {}) => {
    const tree = (isVisible: boolean) => (
      <ThemeProvider theme={BitPayDarkTheme}>
        <SheetModal
          modalLibrary={'bottom-sheet'}
          isVisible={isVisible}
          enableBackdropDismiss={true}
          onBackdropPress={onBackdropPress}>
          <></>
        </SheetModal>
      </ThemeProvider>
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
