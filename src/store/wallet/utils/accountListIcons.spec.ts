import {restoreAccountListIcons} from './accountListIcons';

jest.mock('../../../constants/SupportedCurrencyOptions', () => ({
  CurrencyListIcons: {
    btc: () => 'btc-icon',
    eth: () => 'eth-icon',
    usdc_e: () => 'usdc-icon',
  },
}));

jest.mock('../../../utils/helper-methods', () => ({
  getBadgeImg: jest.fn((currencyAbbreviation: string, chain: string) =>
    currencyAbbreviation === chain ? '' : `${chain}-badge`,
  ),
  getCurrencyAbbreviation: jest.fn((name: string, chain: string) =>
    name === chain ? name : `${name}_${chain[0]}`,
  ),
}));

const roundTripThroughStorage = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value));

describe('restoreAccountListIcons', () => {
  it('restores wallet icons dropped by serialization', () => {
    const persisted = roundTripThroughStorage([
      {
        id: 'account-1',
        wallets: [
          {
            id: 'wallet-1',
            currencyAbbreviation: 'BTC',
            chain: 'btc',
            img: () => 'dropped',
            badgeImg: () => 'dropped',
          },
        ],
      },
    ]);

    expect(persisted[0].wallets[0].img).toBeUndefined();

    const restored = restoreAccountListIcons(persisted);

    expect(typeof restored[0].wallets[0].img).toBe('function');
    expect(restored[0].wallets[0].img()).toBe('btc-icon');
    expect(restored[0].wallets[0].badgeImg).toBe('');
  });

  it('restores token icons and their chain badge', () => {
    const restored = restoreAccountListIcons<any[]>([
      {
        wallets: [
          {
            currencyAbbreviation: 'USDC',
            chain: 'eth',
            tokenAddress: '0xtoken',
          },
        ],
      },
    ]);

    expect(restored[0].wallets[0].img()).toBe('usdc-icon');
    expect(restored[0].wallets[0].badgeImg).toBe('eth-badge');
  });

  it('restores chainImg on assets-by-chain sections', () => {
    const restored = restoreAccountListIcons<any[]>([
      {
        title: 'Ethereum',
        data: [
          {
            chain: 'eth',
            chainAssetsList: [{currencyAbbreviation: 'ETH', chain: 'eth'}],
          },
        ],
      },
    ]);

    expect(restored[0].data[0].chainImg()).toBe('eth-icon');
    expect(restored[0].data[0].chainAssetsList[0].img()).toBe('eth-icon');
  });

  it('keeps a persisted remote logo when there is no bundled icon', () => {
    const restored = restoreAccountListIcons<any[]>([
      {
        wallets: [
          {
            currencyAbbreviation: 'CUSTOM',
            chain: 'eth',
            img: 'https://logos.example/custom.png',
          },
        ],
      },
    ]);

    expect(restored[0].wallets[0].img).toBe('https://logos.example/custom.png');
  });

  it('leaves values without currency data untouched', () => {
    const value = [{id: 'account-1', accountName: 'My Account'}];

    expect(restoreAccountListIcons(value)).toEqual([
      {id: 'account-1', accountName: 'My Account'},
    ]);
  });

  it('handles empty and nullish input', () => {
    expect(restoreAccountListIcons([])).toEqual([]);
    expect(restoreAccountListIcons(undefined)).toBeUndefined();
    expect(restoreAccountListIcons(null)).toBeNull();
  });
});
