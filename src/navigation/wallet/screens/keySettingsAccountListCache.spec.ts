import {
  getKeySettingsAccountListCacheKey,
  getKeySettingsAccountListSignature,
} from './keySettingsAccountListCache';

const makeKey = ({
  balanceSat = 100,
  walletName = 'Bitcoin',
  hideWallet = false,
  accountName = 'EVM Account',
}: {
  balanceSat?: number;
  walletName?: string;
  hideWallet?: boolean;
  accountName?: string;
} = {}) =>
  ({
    id: 'key-1',
    wallets: [
      {
        id: 'wallet-1',
        keyId: 'key-1',
        currencyAbbreviation: 'btc',
        chain: 'btc',
        network: 'livenet',
        receiveAddress: 'wallet-address',
        hideWallet,
        balance: {sat: balanceSat},
        credentials: {walletName},
      },
    ],
    evmAccountsInfo: {
      'account-address': {
        name: accountName,
        hideAccount: false,
      },
    },
  } as any);

describe('keySettingsAccountListCache', () => {
  it('isolates the cached list by key', () => {
    expect(getKeySettingsAccountListCacheKey('key-1')).not.toBe(
      getKeySettingsAccountListCacheKey('key-2'),
    );
  });

  it('does not invalidate settings rows for balance-only updates', () => {
    expect(getKeySettingsAccountListSignature(makeKey({balanceSat: 100}))).toBe(
      getKeySettingsAccountListSignature(makeKey({balanceSat: 200})),
    );
  });

  it('invalidates when wallet settings or account names change', () => {
    const initial = getKeySettingsAccountListSignature(makeKey());

    expect(
      getKeySettingsAccountListSignature(makeKey({walletName: 'Savings'})),
    ).not.toBe(initial);
    expect(
      getKeySettingsAccountListSignature(makeKey({hideWallet: true})),
    ).not.toBe(initial);
    expect(
      getKeySettingsAccountListSignature(
        makeKey({accountName: 'Trading Account'}),
      ),
    ).not.toBe(initial);
  });
});
