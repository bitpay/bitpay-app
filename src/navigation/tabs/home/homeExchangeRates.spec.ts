import {getFiatRateSeriesCacheKey} from '../../../store/rate/rate.models';
import type {SupportedCurrencyOption} from '../../../constants/SupportedCurrencyOptions';
import {buildHomeExchangeRateItems} from './homeExchangeRates';

jest.mock('../../../utils/helper-methods', () => ({
  calculatePercentageDifference: jest.fn(
    (current: number, previous: number) =>
      ((current - previous) * 100) / previous,
  ),
  getCurrencyAbbreviation: jest.fn((value: string) =>
    String(value || '').toLowerCase(),
  ),
  getLastDayTimestampStartOfHourMs: jest.fn(() => 1),
}));

jest.mock('../../../utils/portfolio/assets', () => ({
  findSupportedCurrencyOptionForAsset: jest.fn(
    ({options}: {options: SupportedCurrencyOption[]}) => options[0],
  ),
}));

jest.mock('../../../utils/portfolio/displayCurrency', () => ({
  getAssetCurrentDisplayQuoteRate: jest.fn(
    ({quoteCurrency}: {quoteCurrency: string}) =>
      quoteCurrency === 'EUR' ? 1800 : 2000,
  ),
}));

jest.mock('../../../utils/portfolio/rate', () => ({
  getFiatRateFromSeriesCacheAtTimestamp: jest.fn(() => 1600),
}));

jest.mock('../../bitpay-id/utils/bitpay-id-utils', () => ({
  getCoinAndChainFromCurrencyCode: jest.fn((value: string) => ({
    coin: String(value || '').toLowerCase(),
    chain: String(value || '').toLowerCase(),
  })),
}));

const makeOption = (
  overrides: Partial<SupportedCurrencyOption> = {},
): SupportedCurrencyOption => ({
  id: 'eth-option',
  img: 'eth-image',
  imgSrc: 1 as any,
  currencyName: 'Ethereum',
  currencyAbbreviation: 'eth',
  chain: 'eth',
  chainName: 'Ethereum',
  ...overrides,
});

describe('buildHomeExchangeRateItems', () => {
  it('uses the bridged current spot rate for non-canonical quotes instead of a stale direct target quote', () => {
    const items = buildHomeExchangeRateItems({
      baselineTimestampMs: 1,
      exchangeRateCurrencies: ['eth'],
      supportedCurrencyOptions: [makeOption()],
      quoteCurrency: 'EUR',
      isStableCoinCurrencyName: () => false,
      lastDayRates: {
        eth: [{code: 'EUR', rate: 1500}],
      } as any,
      rates: {
        eth: [
          {code: 'USD', rate: 2000},
          {code: 'EUR', rate: 1701},
        ],
        btc: [
          {code: 'USD', rate: 40000},
          {code: 'EUR', rate: 36000},
        ],
      } as any,
      fiatRateSeriesCache: {
        [getFiatRateSeriesCacheKey('EUR', 'eth', '1D')]: {
          fetchedOn: 1,
          points: [
            {ts: 1, rate: 1600},
            {ts: 2, rate: 1650},
          ],
        },
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].currentPrice).toBeCloseTo(1800, 8);
    expect(items[0].average).toBeCloseTo(12.5, 8);
  });

  it('keeps using the direct current spot rate for canonical USD quotes', () => {
    const items = buildHomeExchangeRateItems({
      baselineTimestampMs: 1,
      exchangeRateCurrencies: ['eth'],
      supportedCurrencyOptions: [makeOption()],
      quoteCurrency: 'USD',
      isStableCoinCurrencyName: () => false,
      lastDayRates: {
        eth: [{code: 'USD', rate: 1500}],
      } as any,
      rates: {
        eth: [{code: 'USD', rate: 2000}],
        btc: [{code: 'USD', rate: 40000}],
      } as any,
      fiatRateSeriesCache: {
        [getFiatRateSeriesCacheKey('USD', 'eth', '1D')]: {
          fetchedOn: 1,
          points: [
            {ts: 1, rate: 1600},
            {ts: 2, rate: 1650},
          ],
        },
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].currentPrice).toBe(2000);
    expect(items[0].average).toBeCloseTo(25, 8);
  });
});
