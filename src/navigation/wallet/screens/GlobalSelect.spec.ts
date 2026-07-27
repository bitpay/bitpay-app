import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {FlashListComponent, flattenGlobalSelectData} from './GlobalSelect';

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

describe('FlashListComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the bottom-sheet scrollable only inside a modal', () => {
    act(() => {
      TestRenderer.create(
        React.createElement(FlashListComponent, {
          data: ['btc'],
          inModal: true,
          renderItem: () => null,
        }),
      );
    });

    expect(mockUseBottomSheetScrollableCreator).toHaveBeenCalledTimes(1);
    expect(mockFlashList).toHaveBeenCalledWith(
      expect.objectContaining({
        renderScrollComponent: mockBottomSheetScrollable,
      }),
    );
  });

  it('preserves the regular FlashList scroll component outside a modal', () => {
    const regularScrollable = jest.fn((_props: unknown) => null);

    act(() => {
      TestRenderer.create(
        React.createElement(FlashListComponent, {
          data: ['btc'],
          inModal: false,
          renderItem: () => null,
          renderScrollComponent: regularScrollable,
        }),
      );
    });

    expect(mockFlashList).toHaveBeenCalledWith(
      expect.objectContaining({
        renderScrollComponent: regularScrollable,
      }),
    );
    expect(mockUseBottomSheetScrollableCreator).not.toHaveBeenCalled();
  });
});

describe('flattenGlobalSelectData', () => {
  it('preserves key/account order with stable semantic row ids', () => {
    const rows = flattenGlobalSelectData([
      {
        key: 'key-1',
        keyName: 'Primary',
        accounts: [{id: 'account-1'}, {id: 'account-2'}],
      } as any,
    ]);

    expect(rows).toEqual([
      {
        __row: 'keyHeader',
        id: 'header-key-1',
        keyName: 'Primary',
      },
      {
        __row: 'account',
        id: 'account-key-1-account-1',
        account: {id: 'account-1'},
        keyId: 'key-1',
      },
      {
        __row: 'account',
        id: 'account-key-1-account-2',
        account: {id: 'account-2'},
        keyId: 'key-1',
      },
    ]);
  });

  it('does not reinterpret stale account-asset search results as currencies', () => {
    const currency = {
      id: 'btc',
      currencyAbbreviation: 'btc',
    };
    const staleAccountAssetResult = {
      id: 'asset-sol',
      chain: 'sol',
      chainAssetsList: [],
    };

    expect(
      flattenGlobalSelectData([
        staleAccountAssetResult as any,
        currency as any,
      ]),
    ).toEqual([
      {
        __row: 'currency',
        id: 'currency-btc',
        item: currency,
      },
    ]);
  });
});
