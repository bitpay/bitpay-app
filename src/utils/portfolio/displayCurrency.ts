import type {Rates} from '../../store/rate/rate.models';
import {getRateByCurrencyName} from '../helper-methods';
import {
  CANONICAL_FIAT_QUOTE,
  FX_BRIDGE_COIN,
} from '../../portfolio/core/fiatRatesShared';

function normalizeQuoteCurrency(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function getDirectSpotRate(args: {
  rates?: Rates;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string | null;
  quoteCurrency: string;
}): number | undefined {
  const walletRates = getRateByCurrencyName(
    args.rates || {},
    args.currencyAbbreviation,
    args.chain,
    args.tokenAddress,
  );
  const currentRate = walletRates?.find(
    rate =>
      normalizeQuoteCurrency(rate?.code) ===
      normalizeQuoteCurrency(args.quoteCurrency),
  )?.rate;

  return typeof currentRate === 'number' &&
    Number.isFinite(currentRate) &&
    currentRate > 0
    ? currentRate
    : undefined;
}

export function resolveActivePortfolioDisplayQuoteCurrency(args: {
  quoteCurrency?: string;
  defaultAltCurrencyIsoCode?: string;
}): string {
  const explicitQuote = normalizeQuoteCurrency(args.quoteCurrency);
  if (explicitQuote) {
    return explicitQuote;
  }

  const defaultAlt = normalizeQuoteCurrency(args.defaultAltCurrencyIsoCode);
  return defaultAlt || CANONICAL_FIAT_QUOTE;
}

export function buildCommittedPortfolioHoldingsRevisionToken(args: {
  lastPopulatedAt?: number;
}): string {
  return typeof args.lastPopulatedAt === 'number' &&
    Number.isFinite(args.lastPopulatedAt)
    ? String(args.lastPopulatedAt)
    : 'uncommitted';
}

export function getUsdToTargetSpotFxRate(args: {
  rates?: Rates;
  quoteCurrency: string;
  bridgeCoin?: string;
}): number | undefined {
  const quoteCurrency = resolveActivePortfolioDisplayQuoteCurrency({
    quoteCurrency: args.quoteCurrency,
  });
  if (quoteCurrency === CANONICAL_FIAT_QUOTE) {
    return 1;
  }

  const bridgeCoin = String(args.bridgeCoin || FX_BRIDGE_COIN)
    .trim()
    .toLowerCase();
  if (!bridgeCoin) {
    return undefined;
  }

  const bridgeCanonicalRate = getDirectSpotRate({
    rates: args.rates,
    currencyAbbreviation: bridgeCoin,
    chain: bridgeCoin,
    quoteCurrency: CANONICAL_FIAT_QUOTE,
  });
  const bridgeTargetRate = getDirectSpotRate({
    rates: args.rates,
    currencyAbbreviation: bridgeCoin,
    chain: bridgeCoin,
    quoteCurrency,
  });

  if (
    typeof bridgeCanonicalRate !== 'number' ||
    !Number.isFinite(bridgeCanonicalRate) ||
    bridgeCanonicalRate <= 0 ||
    typeof bridgeTargetRate !== 'number' ||
    !Number.isFinite(bridgeTargetRate) ||
    bridgeTargetRate <= 0
  ) {
    return undefined;
  }

  // Rates are stored as fiat units per 1 coin, so USD->target is:
  // (target fiat per BTC) / (USD per BTC).
  return bridgeTargetRate / bridgeCanonicalRate;
}

export function getAssetCurrentDisplayQuoteRate(args: {
  rates?: Rates;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string | null;
  quoteCurrency: string;
}): number | undefined {
  const quoteCurrency = resolveActivePortfolioDisplayQuoteCurrency({
    quoteCurrency: args.quoteCurrency,
  });
  const canonicalRate = getDirectSpotRate({
    rates: args.rates,
    currencyAbbreviation: args.currencyAbbreviation,
    chain: args.chain,
    tokenAddress: args.tokenAddress,
    quoteCurrency: CANONICAL_FIAT_QUOTE,
  });

  if (
    typeof canonicalRate !== 'number' ||
    !Number.isFinite(canonicalRate) ||
    canonicalRate <= 0
  ) {
    return undefined;
  }

  if (quoteCurrency === CANONICAL_FIAT_QUOTE) {
    return canonicalRate;
  }

  const usdToTargetFx = getUsdToTargetSpotFxRate({
    rates: args.rates,
    quoteCurrency,
  });

  if (
    typeof usdToTargetFx !== 'number' ||
    !Number.isFinite(usdToTargetFx) ||
    usdToTargetFx <= 0
  ) {
    return undefined;
  }

  const derivedRate = canonicalRate * usdToTargetFx;
  return Number.isFinite(derivedRate) && derivedRate > 0
    ? derivedRate
    : undefined;
}
