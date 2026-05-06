jest.mock('../helper-methods', () => ({
  getRateByCurrencyName: jest.fn(
    (
      rates: Record<string, Array<{code: string; rate: number}>>,
      currencyAbbreviation: string,
    ) => rates[currencyAbbreviation] || [],
  ),
}));

import {
  buildCommittedPortfolioHoldingsRevisionToken,
  getAssetCurrentDisplayQuoteRate,
  getUsdToTargetSpotFxRate,
  resolveActivePortfolioDisplayQuoteCurrency,
} from './displayCurrency';

describe('displayCurrency', () => {
  it('prefers an explicit display quote override before the app default', () => {
    expect(
      resolveActivePortfolioDisplayQuoteCurrency({
        quoteCurrency: 'cad',
        defaultAltCurrencyIsoCode: 'EUR',
      }),
    ).toBe('CAD');
  });

  it('falls back to the app default alt currency and then USD', () => {
    expect(
      resolveActivePortfolioDisplayQuoteCurrency({
        defaultAltCurrencyIsoCode: 'eur',
      }),
    ).toBe('EUR');
    expect(resolveActivePortfolioDisplayQuoteCurrency({})).toBe('USD');
  });

  it('keeps committed holdings revision tokens independent from quote changes', () => {
    expect(
      buildCommittedPortfolioHoldingsRevisionToken({
        lastPopulatedAt: 1234,
      }),
    ).toBe('1234');
    expect(buildCommittedPortfolioHoldingsRevisionToken({})).toBe(
      'uncommitted',
    );
  });

  it('derives USD to target FX from the BTC bridge using fiat-per-coin rates', () => {
    expect(
      getUsdToTargetSpotFxRate({
        quoteCurrency: 'EUR',
        rates: {
          btc: [
            {code: 'USD', rate: 40000},
            {code: 'EUR', rate: 36000},
          ],
        } as any,
      }),
    ).toBeCloseTo(0.9, 8);
  });

  it('returns an identity FX multiplier and canonical spot rate for USD', () => {
    expect(
      getUsdToTargetSpotFxRate({
        quoteCurrency: 'USD',
        rates: {
          btc: [{code: 'USD', rate: 40000}],
        } as any,
      }),
    ).toBe(1);
    expect(
      getAssetCurrentDisplayQuoteRate({
        quoteCurrency: 'USD',
        currencyAbbreviation: 'eth',
        chain: 'eth',
        rates: {
          eth: [{code: 'USD', rate: 2500}],
          btc: [{code: 'USD', rate: 40000}],
        } as any,
      }),
    ).toBe(2500);
  });

  it('derives current target spot rates from canonical USD plus the BTC bridge', () => {
    expect(
      getAssetCurrentDisplayQuoteRate({
        quoteCurrency: 'EUR',
        currencyAbbreviation: 'eth',
        chain: 'eth',
        rates: {
          eth: [
            {code: 'USD', rate: 2000},
            {code: 'EUR', rate: 999999},
          ],
          btc: [
            {code: 'USD', rate: 40000},
            {code: 'EUR', rate: 36000},
          ],
        } as any,
      }),
    ).toBeCloseTo(1800, 8);
  });
});
