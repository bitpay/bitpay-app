import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import type {Key, Wallet} from '../../../../store/wallet/wallet.models';
import type {ContactRowProps} from '../../../../components/list/ContactRow';
import type {ReceivingAddress} from '../../../../store/bitpay-id/bitpay-id.models';
import {
  findEmailReceivingAddress,
  getContactSendRecipient,
  getEmailRecipientAddress,
  isSendableData,
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

const mockStartFetchReceivingAddresses = jest.fn();

jest.mock('../../../../store/bitpay-id/bitpay-id.effects', () => ({
  startFetchReceivingAddresses: (...args: unknown[]) =>
    mockStartFetchReceivingAddresses(...args),
}));

const BTC_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

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

describe('getContactSendRecipient', () => {
  it('strips the BCH prefix and keeps the contact network and legacy tag', () => {
    const recipient = getContactSendRecipient({
      name: 'Alice',
      address: 'bitcoincash:qr00upv8qjgkym8zng3f663n9qte9ljuqqcs8eep5w',
      coin: 'bch',
      chain: 'bch',
      network: 'livenet',
      tag: 7,
    } as ContactRowProps);

    expect(recipient).toEqual({
      name: 'Alice',
      address: 'qr00upv8qjgkym8zng3f663n9qte9ljuqqcs8eep5w',
      currency: 'bch',
      chain: 'bch',
      network: 'livenet',
      destinationTag: 7,
      opts: {
        showEVMWalletsAndTokens: false,
        showSVMWalletsAndTokens: false,
      },
    });
  });

  it('lets an EVM contact be paid from any EVM wallet', () => {
    const recipient = getContactSendRecipient({
      name: 'Bob',
      address: '0x1111111111111111111111111111111111111111',
      coin: 'usdc',
      chain: 'matic',
      network: 'livenet',
    } as ContactRowProps);

    expect(recipient.address).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(recipient.opts).toEqual({
      showEVMWalletsAndTokens: true,
      showSVMWalletsAndTokens: false,
    });
  });
});

describe('findEmailReceivingAddress', () => {
  const receivingAddresses = [
    {coin: 'USDC', chain: 'ETH', address: 'usdc-eth'},
    {coin: 'usdc', chain: 'matic', address: 'usdc-matic'},
  ] as ReceivingAddress[];

  it('matches the wallet currency and chain regardless of case', () => {
    expect(
      findEmailReceivingAddress(receivingAddresses, 'usdc', 'eth')?.address,
    ).toBe('usdc-eth');
    expect(
      findEmailReceivingAddress(receivingAddresses, 'USDC', 'MATIC')?.address,
    ).toBe('usdc-matic');
  });

  it('returns undefined when the email has no address for that chain', () => {
    expect(
      findEmailReceivingAddress(receivingAddresses, 'usdc', 'arb'),
    ).toBeUndefined();
  });
});

describe('getEmailRecipientAddress', () => {
  const btcWallet = {
    currencyAbbreviation: 'btc',
    chain: 'btc',
    network: 'livenet',
  } as Wallet;
  const dispatch = (action: unknown) => action;
  const resolve = (wallet: Wallet) =>
    getEmailRecipientAddress('alice@example.com', wallet)(
      dispatch as any,
      jest.fn(),
      undefined,
    );

  beforeEach(() => {
    mockStartFetchReceivingAddresses.mockReset();
  });

  it('returns the address the email registered for the wallet currency', async () => {
    mockStartFetchReceivingAddresses.mockResolvedValue([
      {coin: 'eth', chain: 'eth', address: '0xother'},
      {coin: 'btc', chain: 'btc', address: BTC_ADDRESS},
    ]);

    await expect(resolve(btcWallet)).resolves.toBe(BTC_ADDRESS);
    expect(mockStartFetchReceivingAddresses).toHaveBeenCalledWith({
      email: 'alice@example.com',
      currency: 'BTC',
    });
  });

  it('ignores an address that is not valid for the wallet network', async () => {
    mockStartFetchReceivingAddresses.mockResolvedValue([
      {coin: 'btc', chain: 'btc', address: BTC_ADDRESS},
    ]);

    await expect(
      resolve({...btcWallet, network: 'testnet'} as Wallet),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the lookup fails', async () => {
    mockStartFetchReceivingAddresses.mockRejectedValue(new Error('offline'));

    await expect(resolve(btcWallet)).resolves.toBeUndefined();
  });
});

describe('isSendableData', () => {
  it('accepts payment addresses, payment URIs and BitPay invoice links', () => {
    expect(isSendableData(BTC_ADDRESS)).toBe(true);
    expect(isSendableData(`bitcoin:${BTC_ADDRESS}?amount=0.1`)).toBe(true);
    expect(isSendableData('0x1111111111111111111111111111111111111111')).toBe(
      true,
    );
    expect(isSendableData('https://bitpay.com/invoice?id=AbC123')).toBe(true);
  });

  it('rejects text that is not a payment destination', () => {
    expect(isSendableData('alice')).toBe(false);
    expect(isSendableData('wc:abc@2?relay-protocol=irn&symKey=xyz')).toBe(
      false,
    );
  });
});
