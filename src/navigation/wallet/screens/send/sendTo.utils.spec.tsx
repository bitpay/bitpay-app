import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import type {Key} from '../../../../store/wallet/wallet.models';
import {
  useDebouncedSendToValidation,
  useSendToKeyAccounts,
} from './sendTo.utils';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockBuildAccountList = jest.fn((..._args: unknown[]) => []);
const mockBuildKeyWalletRowsFromAccountList = jest.fn(
  (..._args: unknown[]) => ({
    accounts: [],
    mergedUtxoAndEvmAccounts: [],
  }),
);

jest.mock('../../../../store/wallet/utils/wallet', () => ({
  buildAccountList: (...args: unknown[]) => mockBuildAccountList(...args),
  buildKeyWalletRowsFromAccountList: (...args: unknown[]) =>
    mockBuildKeyWalletRowsFromAccountList(...args),
}));

describe('useSendToKeyAccounts', () => {
  const key = {
    id: 'key-1',
    keyName: 'Main key',
    backupComplete: true,
    wallets: [],
  } as unknown as Key;
  const keys = {'key-1': key};
  const rates = {};
  const dispatch = jest.fn() as any;
  const logger = {error: jest.fn()};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses built rows for unrelated renders and rebuilds for a changed query', () => {
    let latestRows: ReturnType<typeof useSendToKeyAccounts> = [];
    const Probe = ({
      query,
      unrelatedRevision,
    }: {
      query: string;
      unrelatedRevision: number;
    }) => {
      latestRows = useSendToKeyAccounts({
        keys,
        currentWalletId: 'wallet-1',
        currentCurrencyAbbreviation: 'btc',
        currentChain: 'btc',
        currentNetwork: 'livenet' as any,
        defaultAltCurrencyIsoCode: 'USD',
        searchInput: query,
        rates,
        dispatch,
        logger,
      });

      return <>{unrelatedRevision}</>;
    };

    let view!: TestRenderer.ReactTestRenderer;
    act(() => {
      view = TestRenderer.create(<Probe query="" unrelatedRevision={0} />);
    });

    expect(mockBuildAccountList).toHaveBeenCalledTimes(1);
    expect(mockBuildAccountList.mock.calls[0][0]).toBe(key);
    expect(latestRows).toEqual([
      expect.objectContaining({
        key: 'key-1',
      }),
    ]);
    expect(latestRows[0]).not.toHaveProperty('coinbaseAccounts');

    act(() => {
      view.update(<Probe query="" unrelatedRevision={1} />);
    });

    expect(mockBuildAccountList).toHaveBeenCalledTimes(1);

    act(() => {
      view.update(<Probe query="savings" unrelatedRevision={2} />);
    });

    expect(mockBuildAccountList).toHaveBeenCalledTimes(2);
  });
});

describe('useDebouncedSendToValidation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates only the latest value, keeps a stable callback, and cancels on unmount', () => {
    const firstValidate = jest.fn();
    const secondValidate = jest.fn();
    let debouncedValidate!: ReturnType<typeof useDebouncedSendToValidation>;
    const Probe = ({validate}: {validate: (text: string) => void}) => {
      debouncedValidate = useDebouncedSendToValidation(validate, 300);
      return null;
    };

    let view!: TestRenderer.ReactTestRenderer;
    act(() => {
      view = TestRenderer.create(<Probe validate={firstValidate} />);
    });
    const firstDebouncedValidate = debouncedValidate;

    act(() => {
      debouncedValidate('b');
      debouncedValidate('bc');
      jest.advanceTimersByTime(299);
    });

    expect(firstValidate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(firstValidate).toHaveBeenCalledTimes(1);
    expect(firstValidate).toHaveBeenCalledWith('bc');

    act(() => {
      view.update(<Probe validate={secondValidate} />);
    });

    expect(debouncedValidate).toBe(firstDebouncedValidate);

    act(() => {
      debouncedValidate('latest-callback');
      jest.advanceTimersByTime(300);
    });

    expect(firstValidate).toHaveBeenCalledTimes(1);
    expect(secondValidate).toHaveBeenCalledTimes(1);
    expect(secondValidate).toHaveBeenCalledWith('latest-callback');

    act(() => {
      debouncedValidate('cancelled');
      view.unmount();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(secondValidate).toHaveBeenCalledTimes(1);
  });
});
