jest.mock('../../constants', () => ({
  Network: {
    mainnet: 'livenet',
  },
}));

jest.mock('../../constants/currencies', () => ({
  BitpaySupportedCoins: {},
  BitpaySupportedTokens: {},
  BitpaySupportedUtxoCoins: {},
}));

jest.mock('../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: () => ({tokenDataByAddress: {}}),
  },
}));

jest.mock('../../store/wallet/utils/currency', () => ({
  IsSVMChain: jest.fn(() => false),
}));

jest.mock('../../store/wallet/utils/wallet', () => ({
  getWalletStableDeduplicationId: jest.fn(
    (wallet?: {id?: string; credentials?: {walletId?: string}}) =>
      wallet?.id || wallet?.credentials?.walletId,
  ),
  isWalletVisibleForKey: jest.fn(
    (
      _key: any,
      wallet?: {hideWallet?: boolean; hideWalletByAccount?: boolean},
    ) => !!wallet && !wallet.hideWallet && !wallet.hideWalletByAccount,
  ),
}));

jest.mock('../helper-methods', () => ({
  calculatePercentageDifference: jest.fn(() => 0),
  formatCurrencyAbbreviation: (value: string) => value,
  formatFiatAmount: () => '0',
  getCurrencyAbbreviation: (value: string) => value,
  unitStringToAtomicBigInt: jest.fn(() => 0n),
}));

jest.mock('./displayCurrency', () => ({
  getAssetCurrentDisplayQuoteRate: jest.fn(() => undefined),
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({quoteCurrency}: {quoteCurrency?: string}) => quoteCurrency || 'USD',
  ),
}));

jest.mock('../../portfolio/core/format', () => ({
  formatBigIntDecimal: jest.fn(() => '0'),
}));

import {getHiddenKeyIdsFromHomeCarouselConfig} from './assets';

describe('getHiddenKeyIdsFromHomeCarouselConfig', () => {
  const makeKey = (id: string) => ({id, wallets: []} as any);

  it('returns only real hidden wallet key ids', () => {
    const result = getHiddenKeyIdsFromHomeCarouselConfig({
      keys: {k1: makeKey('k1'), k2: makeKey('k2')},
      homeCarouselConfig: [
        {id: 'k1', show: false},
        {id: 'k2', show: true},
        {id: 'missing-key', show: false},
        {id: 'coinbaseBalanceCard', show: false},
      ] as any,
    });

    expect(Array.from(result)).toEqual(['k1']);
  });

  it('returns empty when keys are unavailable', () => {
    const result = getHiddenKeyIdsFromHomeCarouselConfig({
      keys: undefined,
      homeCarouselConfig: [{id: 'k1', show: false}] as any,
    });

    expect(Array.from(result)).toEqual([]);
  });
});
