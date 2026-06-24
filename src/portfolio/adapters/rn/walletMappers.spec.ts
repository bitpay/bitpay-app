jest.mock('../../../utils/portfolio/assets', () => ({
  getPortfolioWalletTokenAddress: jest.fn((wallet: any) =>
    typeof wallet?.tokenAddress === 'string' ? wallet.tokenAddress : undefined,
  ),
  getWalletLiveAtomicBalance: jest.fn(({wallet, unitDecimals}: any) => {
    const crypto = Number(wallet?.balance?.crypto || 0);
    return BigInt(Math.round(crypto * 10 ** unitDecimals));
  }),
}));

import {
  extractPortfolioWalletCredentialsSnapshot,
  toPortfolioStoredWallet,
} from './walletMappers';
import {
  isPortfolioRuntimeMainnetLikeNetwork,
  isPortfolioRuntimeEligibleWallet,
  summarizePortfolioRuntimeWalletEligibility,
} from './walletEligibility';

describe('walletMappers', () => {
  it('detects runtime-eligible mainnet wallets with request signing credentials', () => {
    const wallet = {
      id: 'wallet-1',
      chain: 'eth',
      network: 'livenet',
      currencyAbbreviation: 'usdc',
      tokenAddress: '0xToken',
      walletName: 'My Wallet',
      balance: {
        crypto: '12.5',
      },
      receiveAddress: '0xAbC123',
      credentials: {
        walletId: 'wallet-1',
        copayerId: 'copayer-1',
        requestPrivKey: 'priv-key',
        requestPubKey: 'pub-key',
        walletName: 'My Wallet',
        chain: 'eth',
        network: 'livenet',
        coin: 'usdc',
        token: {
          address: '0xToken',
          symbol: 'usdc',
        },
        isComplete: () => true,
      },
    } as any;

    expect(isPortfolioRuntimeEligibleWallet(wallet)).toBe(true);

    const credentials = extractPortfolioWalletCredentialsSnapshot(wallet);
    expect(credentials.walletId).toBe('wallet-1');
    expect(credentials.requestPrivKey).toBe('priv-key');
    expect(credentials.token?.address).toBe('0xToken');
    expect(credentials.receiveAddress).toBe('0xAbC123');

    const stored = toPortfolioStoredWallet({
      wallet,
      unitDecimals: 6,
      addedAt: 123,
    });
    expect(stored.addedAt).toBe(123);
    expect(stored.summary.walletId).toBe('wallet-1');
    expect(stored.summary.currencyAbbreviation).toBe('usdc');
    expect(stored.summary.tokenAddress).toBe('0xToken');
    expect(stored.summary.unitDecimals).toBe(6);
    expect(stored.summary.balanceAtomic).toBe('12500000');
  });

  it('rejects wallets that are incomplete or missing signing credentials', () => {
    const wallet = {
      id: 'wallet-2',
      chain: 'btc',
      network: 'livenet',
      currencyAbbreviation: 'btc',
      balance: {
        crypto: '0.1',
      },
      credentials: {
        walletId: 'wallet-2',
        copayerId: 'copayer-2',
        isComplete: () => false,
      },
    } as any;

    expect(isPortfolioRuntimeEligibleWallet(wallet)).toBe(false);
  });

  it('treats both livenet and mainnet as runtime-mainnet networks', () => {
    expect(isPortfolioRuntimeMainnetLikeNetwork('livenet')).toBe(true);
    expect(isPortfolioRuntimeMainnetLikeNetwork('mainnet')).toBe(true);
    expect(isPortfolioRuntimeMainnetLikeNetwork('testnet')).toBe(false);
  });

  it('summarizes runtime wallet eligibility without exposing identifiers', () => {
    const summary = summarizePortfolioRuntimeWalletEligibility([
      {
        id: 'wallet-1',
        network: 'livenet',
        pendingTssSession: false,
        credentials: {
          walletId: 'wallet-1',
          copayerId: 'copayer-1',
          requestPrivKey: 'priv-key',
          isComplete: () => true,
        },
      } as any,
      {
        id: 'wallet-2',
        network: 'mainnet',
        pendingTssSession: true,
        credentials: {
          walletId: 'wallet-2',
          copayerId: 'copayer-2',
          requestPrivKey: '',
          isComplete: () => true,
        },
      } as any,
      {
        id: 'wallet-3',
        network: 'testnet',
        pendingTssSession: false,
        credentials: {
          walletId: 'wallet-3',
          copayerId: '',
          requestPrivKey: 'priv-key-3',
          isComplete: () => false,
        },
      } as any,
    ]);

    expect(summary).toEqual({
      walletCount: 3,
      eligibleWalletCount: 1,
      excludedWalletCount: 2,
      missingWalletIdCount: 0,
      missingCopayerIdCount: 1,
      missingRequestPrivKeyCount: 1,
      nonMainnetNetworkCount: 1,
      pendingTssSessionCount: 1,
      incompleteCredentialsCount: 1,
    });
  });
});
