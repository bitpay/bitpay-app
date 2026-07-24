import {
  CANONICAL_FIAT_QUOTE,
  FX_BRIDGE_COIN,
} from '../../../../portfolio/core/fiatRatesShared';
import {buildExchangeRateHistoricalRateRequestGroups} from './exchangeRateHistoricalRateRequests';

describe('buildExchangeRateHistoricalRateRequestGroups', () => {
  const intervals = ['1D', '1W', '1M', 'ALL'] as const;

  it('requests canonical asset and bridge dependencies for non-canonical quotes', () => {
    expect(
      buildExchangeRateHistoricalRateRequestGroups({
        quoteCurrency: 'EUR',
        normalizedCoin: 'eth',
        intervals,
        hasValidNormalizedCoin: true,
      }),
    ).toEqual({
      canonicalQuoteCurrency: CANONICAL_FIAT_QUOTE,
      canonicalRequests: [
        {
          coin: 'eth',
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
        {
          coin: FX_BRIDGE_COIN,
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
      ],
      displayQuoteCurrency: 'EUR',
      displayQuoteRequests: [
        {
          coin: FX_BRIDGE_COIN,
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
      ],
    });
  });

  it('dedupes BTC bridge requests when the selected asset is BTC', () => {
    expect(
      buildExchangeRateHistoricalRateRequestGroups({
        quoteCurrency: 'EUR',
        normalizedCoin: 'btc',
        intervals,
        hasValidNormalizedCoin: true,
      }),
    ).toEqual({
      canonicalQuoteCurrency: CANONICAL_FIAT_QUOTE,
      canonicalRequests: [
        {
          coin: FX_BRIDGE_COIN,
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
      ],
      displayQuoteCurrency: 'EUR',
      displayQuoteRequests: [
        {
          coin: FX_BRIDGE_COIN,
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
      ],
    });
  });

  it('does not request display-quote bridge data for canonical quote charts', () => {
    expect(
      buildExchangeRateHistoricalRateRequestGroups({
        quoteCurrency: 'USD',
        normalizedCoin: 'eth',
        intervals,
        hasValidNormalizedCoin: true,
      }),
    ).toEqual({
      canonicalQuoteCurrency: CANONICAL_FIAT_QUOTE,
      canonicalRequests: [
        {
          coin: 'eth',
          intervals: ['1D', '1M', '1W', 'ALL'],
        },
      ],
      displayQuoteCurrency: 'USD',
      displayQuoteRequests: [],
    });
  });
});
