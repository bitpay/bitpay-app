/**
 * Tests for buy-crypto.effects.ts
 *
 * Covers:
 *   - calculateAltFiatToUsd
 *   - calculateUsdToAltFiat
 *   - calculateAnyFiatToAltFiat
 *   - roundUpNice
 *   - getBuyCryptoFiatLimits
 */

import configureTestStore from '@test/store';
import {
  calculateAltFiatToUsd,
  calculateUsdToAltFiat,
  calculateAnyFiatToAltFiat,
  roundUpNice,
  getBuyCryptoFiatLimits,
} from './buy-crypto.effects';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock navigationRef to avoid native navigation calls
jest.mock('../../Root', () => ({
  navigationRef: {navigate: jest.fn(), dispatch: jest.fn()},
}));

// Mock analytics so goToBuyCrypto doesn't need a real Mixpanel instance
jest.mock('../analytics/analytics.effects', () => ({
  Analytics: {
    track: jest.fn(() => ({type: 'ANALYTICS/TRACK'})),
  },
}));

// Mock all exchange fiat-limit helpers so we control their return values
jest.mock(
  '../../navigation/services/buy-crypto/utils/banxa-utils',
  () => ({getBanxaFiatAmountLimits: jest.fn(() => ({min: 35, max: 14000}))}),
);
jest.mock(
  '../../navigation/services/buy-crypto/utils/moonpay-utils',
  () => ({getMoonpayFiatAmountLimits: jest.fn(() => ({min: 25, max: 10000}))}),
);
jest.mock(
  '../../navigation/services/buy-crypto/utils/ramp-utils',
  () => ({getRampFiatAmountLimits: jest.fn(() => ({min: 20, max: 10000}))}),
);
jest.mock(
  '../../navigation/services/buy-crypto/utils/sardine-utils',
  () => ({getSardineFiatAmountLimits: jest.fn(() => ({min: 10, max: 5000}))}),
);
jest.mock(
  '../../navigation/services/buy-crypto/utils/simplex-utils',
  () => ({getSimplexFiatAmountLimits: jest.fn(() => ({min: 50, max: 20000}))}),
);
jest.mock(
  '../../navigation/services/buy-crypto/utils/transak-utils',
  () => ({getTransakFiatAmountLimits: jest.fn(() => ({min: 30, max: 15000}))}),
);

// ---------------------------------------------------------------------------
// Shared rate fixture
// btc/USD rate = 50000, btc/EUR rate = 45000
// → 1 USD = 0.9 EUR,  1 EUR = 1.111... USD
// ---------------------------------------------------------------------------
const rateState = {
  RATE: {
    rates: {
      btc: [
        {code: 'USD', rate: 50000},
        {code: 'EUR', rate: 45000},
      ],
    },
    lastDayRates: {},
    fiatRateSeriesCache: {},
    ratesCacheKey: {},
  },
};

// ---------------------------------------------------------------------------
// roundUpNice (pure function — no store needed)
// ---------------------------------------------------------------------------
describe('roundUpNice', () => {
  it('returns 0 for n <= 0', () => {
    expect(roundUpNice(0)).toBe(0);
    expect(roundUpNice(-5)).toBe(0);
  });

  it('rounds up small values to next nice number', () => {
    // magnitude=1, step=0.5 → next multiple of 0.5 above 8.3 = 8.5
    expect(roundUpNice(8.3)).toBe(8.5);
    // magnitude=10, step=5 → next multiple of 5 above 11 = 15
    expect(roundUpNice(11)).toBe(15);
  });

  it('rounds up hundreds', () => {
    // 207.75 → magnitude 100, step 50 → next multiple of 50 above 207.75 = 250
    expect(roundUpNice(207.75)).toBe(250);
  });

  it('rounds up thousands', () => {
    // 23456.45 → magnitude 10000, step 5000 → next multiple of 5000 above 23456.45 = 25000
    expect(roundUpNice(23456.45)).toBe(25000);
  });

  it('returns the value unchanged when it is already a nice number', () => {
    expect(roundUpNice(500)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// calculateAltFiatToUsd
// ---------------------------------------------------------------------------
describe('calculateAltFiatToUsd', () => {
  it('returns the same amount when currency is already USD', () => {
    const store = configureTestStore(rateState);
    const result = store.dispatch(calculateAltFiatToUsd(100, 'USD'));
    expect(result).toBe(100);
  });

  it('converts EUR → USD using BTC rates', () => {
    const store = configureTestStore(rateState);
    // rateAltUsd = 50000 / 45000 ≈ 1.1111
    // 90 EUR * 1.1111 = 100 USD (approx)
    const result = store.dispatch(calculateAltFiatToUsd(90, 'EUR'));
    expect(result).toBeCloseTo(100, 0);
  });

  it('returns undefined when there are no rates for the currency', () => {
    const store = configureTestStore(rateState);
    const result = store.dispatch(calculateAltFiatToUsd(100, 'JPY'));
    expect(result).toBeUndefined();
  });

  it('is case-insensitive for currency codes', () => {
    const store = configureTestStore(rateState);
    const upper = store.dispatch(calculateAltFiatToUsd(90, 'EUR'));
    const lower = store.dispatch(calculateAltFiatToUsd(90, 'eur'));
    expect(upper).toEqual(lower);
  });
});

// ---------------------------------------------------------------------------
// calculateUsdToAltFiat
// ---------------------------------------------------------------------------
describe('calculateUsdToAltFiat', () => {
  it('converts USD → EUR using BTC rates', () => {
    const store = configureTestStore(rateState);
    // rateAltUsd = 45000 / 50000 = 0.9
    // 100 USD * 0.9 = 90 EUR
    const result = store.dispatch(calculateUsdToAltFiat(100, 'EUR'));
    expect(result).toBeCloseTo(90, 1);
  });

  it('returns undefined when no rates exist for the target currency', () => {
    const store = configureTestStore(rateState);
    const result = store.dispatch(calculateUsdToAltFiat(100, 'JPY'));
    expect(result).toBeUndefined();
  });

  it('respects a custom decimalPrecision', () => {
    const store = configureTestStore(rateState);
    // 100 USD → EUR with precision 4
    const result = store.dispatch(calculateUsdToAltFiat(100, 'EUR', 4));
    // 100 * (45000/50000) = 90.0000
    expect(result).toBe(90);
  });

  it('returns undefined when rates object has no btc entry', () => {
    const store = configureTestStore({
      RATE: {rates: {btc: []}, lastDayRates: {}, fiatRateSeriesCache: {}, ratesCacheKey: {}},
    });
    const result = store.dispatch(calculateUsdToAltFiat(100, 'EUR'));
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// calculateAnyFiatToAltFiat
// ---------------------------------------------------------------------------
describe('calculateAnyFiatToAltFiat', () => {
  it('returns the same amount when from and to currencies are identical', () => {
    const store = configureTestStore(rateState);
    const result = store.dispatch(calculateAnyFiatToAltFiat(200, 'USD', 'usd'));
    expect(result).toBe(200);
  });

  it('converts EUR → USD', () => {
    const store = configureTestStore(rateState);
    // newRate = rateBtcUSD / rateBtcEUR = 50000/45000 ≈ 1.1111
    // 90 EUR * 1.1111 ≈ 100 USD
    const result = store.dispatch(calculateAnyFiatToAltFiat(90, 'EUR', 'USD'));
    expect(result).toBeCloseTo(100, 0);
  });

  it('converts USD → EUR', () => {
    const store = configureTestStore(rateState);
    // newRate = 45000/50000 = 0.9
    const result = store.dispatch(calculateAnyFiatToAltFiat(100, 'USD', 'EUR'));
    expect(result).toBeCloseTo(90, 1);
  });

  it('returns undefined when source currency has no rate', () => {
    const store = configureTestStore(rateState);
    const result = store.dispatch(calculateAnyFiatToAltFiat(100, 'JPY', 'EUR'));
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getBuyCryptoFiatLimits
// ---------------------------------------------------------------------------
describe('getBuyCryptoFiatLimits', () => {
  it('returns banxa limits directly for USD (a base fiat)', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('banxa', 'USD'));
    expect(limits).toEqual({min: 35, max: 14000});
  });

  it('returns moonpay limits directly for EUR (a base fiat)', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('moonpay', 'EUR'));
    expect(limits).toEqual({min: 25, max: 10000});
  });

  it('returns ramp limits directly for USD', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('ramp', 'USD'));
    expect(limits).toEqual({min: 20, max: 10000});
  });

  it('returns sardine limits directly for USD', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('sardine', 'USD'));
    expect(limits).toEqual({min: 10, max: 5000});
  });

  it('returns simplex limits directly for USD', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('simplex', 'USD'));
    expect(limits).toEqual({min: 50, max: 20000});
  });

  it('returns transak limits directly for USD', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('transak', 'USD'));
    expect(limits).toEqual({min: 30, max: 15000});
  });

  it('returns the global min/max when no specific exchange is given', () => {
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits(undefined, 'USD'));
    // min: Math.min(35,25,20,10,50,30) = 10
    // max: Math.max(14000,10000,10000,5000,20000,15000) = 20000
    expect(limits.min).toBe(10);
    expect(limits.max).toBe(20000);
  });

  it('converts limits from USD to EUR when fiatCurrency is EUR for sardine (USD-only exchange)', () => {
    // sardine only accepts USD as a base fiat, so EUR limits should be converted
    const store = configureTestStore(rateState);
    const limits = store.dispatch(getBuyCryptoFiatLimits('sardine', 'EUR'));
    // USD→EUR: 10*0.9=9, 5000*0.9=4500
    expect(limits.min).toBeCloseTo(9, 0);
    expect(limits.max).toBeCloseTo(4500, 0);
  });

  it('returns undefined min/max when rates are missing for the alt currency', () => {
    const store = configureTestStore({
      RATE: {rates: {btc: []}, lastDayRates: {}, fiatRateSeriesCache: {}, ratesCacheKey: {}},
    });
    const limits = store.dispatch(getBuyCryptoFiatLimits('sardine', 'JPY'));
    expect(limits.min).toBeUndefined();
    expect(limits.max).toBeUndefined();
  });
});
