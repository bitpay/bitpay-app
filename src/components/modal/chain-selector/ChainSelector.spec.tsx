import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ChainSelectorFlashList} from './ChainSelector';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockFlashList = jest.fn((_props: unknown) => null);
const mockBottomSheetScrollable = jest.fn((_props: unknown) => null);
const mockUseBottomSheetScrollableCreator = jest.fn(
  () => mockBottomSheetScrollable,
);

jest.mock('@gorhom/bottom-sheet', () => ({
  useBottomSheetScrollableCreator: () => mockUseBottomSheetScrollableCreator(),
}));

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: unknown) => mockFlashList(props),
}));

jest.mock('../../../navigation/wallet/screens/GlobalSelect', () => ({
  WalletSelectMenuHeaderContainer: () => null,
}));

describe('ChainSelectorFlashList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('integrates FlashList with the bottom-sheet scrollable creator', () => {
    act(() => {
      TestRenderer.create(
        <ChainSelectorFlashList data={['btc']} renderItem={() => null} />,
      );
    });

    expect(mockUseBottomSheetScrollableCreator).toHaveBeenCalledTimes(1);
    expect(mockFlashList).toHaveBeenCalledWith(
      expect.objectContaining({
        renderScrollComponent: mockBottomSheetScrollable,
      }),
    );
  });
});
