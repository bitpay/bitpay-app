import React from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {render, waitFor} from '@test/render';
import SheetModal from './SheetModal';

describe('SheetModal', () => {
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
});
