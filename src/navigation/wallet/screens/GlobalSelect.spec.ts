import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  FlashListComponent,
  flattenGlobalSelectData,
  preloadCustomGlobalSelectList,
  resolveCustomGlobalSelectList,
  shouldShowGlobalSelectEmptyState,
} from './GlobalSelect';

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

describe('custom modal list preloading', () => {
  const btc = {
    currencyAbbreviation: 'btc',
    chain: 'btc',
    name: 'Bitcoin',
    logoUri: 'btc.svg',
  } as any;
  const makeWallet = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'wallet-1',
      keyId: 'key-1',
      currencyAbbreviation: 'btc',
      chain: 'btc',
      network: 'livenet',
      receiveAddress: 'btc-address',
      balance: {sat: 100},
      isComplete: () => true,
      ...overrides,
    } as any);

  it('reuses a warm list while its currencies and wallets are unchanged', () => {
    const wallet = makeWallet();
    const first = resolveCustomGlobalSelectList({
      customToSelectCurrencies: [btc],
      wallets: [wallet],
    });
    const second = resolveCustomGlobalSelectList({
      customToSelectCurrencies: [btc],
      wallets: [wallet],
      previous: first,
    });

    expect(second).toBe(first);
    expect(second.data).toHaveLength(1);
    expect(second.data[0].availableWallets).toEqual([wallet]);
  });

  it('invalidates the warm list when a displayed balance changes', () => {
    const first = resolveCustomGlobalSelectList({
      customToSelectCurrencies: [btc],
      wallets: [makeWallet()],
    });
    const second = resolveCustomGlobalSelectList({
      customToSelectCurrencies: [btc],
      wallets: [makeWallet({balance: {sat: 200}})],
      previous: first,
    });

    expect(second).not.toBe(first);
    expect(second.signature).not.toBe(first.signature);
  });

  it('preloads only visible livenet wallets for the Swap To modal', () => {
    const visibleWallet = makeWallet();
    const preloaded = preloadCustomGlobalSelectList({
      keys: {
        'key-1': {
          wallets: [
            visibleWallet,
            makeWallet({id: 'hidden-wallet', hideWallet: true}),
            makeWallet({id: 'testnet-wallet', network: 'testnet'}),
          ],
        },
      } as any,
      customToSelectCurrencies: [btc],
    });

    expect(preloaded.data[0].availableWallets).toEqual([visibleWallet]);
  });

  it('includes visible testnet wallets when the modal allows them', () => {
    const visibleWallet = makeWallet();
    const testnetWallet = makeWallet({
      id: 'testnet-wallet',
      network: 'testnet',
    });
    const preloaded = preloadCustomGlobalSelectList({
      keys: {
        'key-1': {
          wallets: [
            visibleWallet,
            testnetWallet,
            makeWallet({id: 'hidden-wallet', hideWallet: true}),
          ],
        },
      } as any,
      customToSelectCurrencies: [btc],
      livenetOnly: false,
    });

    expect(preloaded.data[0].availableWallets).toEqual([
      visibleWallet,
      testnetWallet,
    ]);
  });
});

describe('custom modal rendering readiness', () => {
  it('does not expose the empty state before content is ready', () => {
    expect(
      shouldShowGlobalSelectEmptyState({
        isContentReady: false,
        currenciesSupportedCount: 0,
        customCurrenciesSupportedCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldShowGlobalSelectEmptyState({
        isContentReady: true,
        currenciesSupportedCount: 0,
        customCurrenciesSupportedCount: 0,
      }),
    ).toBe(true);
  });
});
