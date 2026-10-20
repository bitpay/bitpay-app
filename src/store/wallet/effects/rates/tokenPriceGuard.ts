import type {FiatRateSeries} from '../../../rate/rate.models';
import {getFiatRateSeriesCacheKey} from '../../../../portfolio/core/fiatRatesShared';
import type {FiatRateCacheRequest} from '../../../../portfolio/core/fiatRatesShared';

/**
 * Live token prices come from a third-party price API (Moralis). For some
 * tokens it disagrees badly with BitPay's own rates service, which the
 * portfolio history already uses: Aave v3 aUSDC on Arbitrum priced at
 * $0.6165 while BWS has it at $0.9999. The wrong price flowed into every
 * balance (header, asset rows) and made the balance chart end in a cliff.
 *
 * When BWS has a recent price for the same token and the live price is
 * further than this from it, the BWS price is used instead.
 */
export const TOKEN_PRICE_MAX_DEVIATION = 0.2;

/**
 * A reference older than this is not trusted to overrule a live price: a
 * volatile token can legitimately move more than the deviation in a day.
 */
export const TOKEN_PRICE_REFERENCE_MAX_AGE_MS = 30 * 60 * 1000;

/** Rate-series cache entries younger than this are reused, not refetched. */
export const TOKEN_PRICE_REFERENCE_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

/** Never hold up a rates refresh for longer than this waiting on BWS. */
export const TOKEN_PRICE_REFERENCE_TIMEOUT_MS = 2500;

export type TokenPriceReference = {
  usdPrice: number;
  /** % change over the reference series (about 24 h for 1D). */
  percentChange?: number;
};

export type TokenPriceRef = {
  chain: string;
  tokenAddress: string;
  symbol: string;
};

const getTokenPriceReferenceKey = (token: TokenPriceRef): string =>
  getFiatRateSeriesCacheKey('USD', token.symbol, '1D', {
    chain: token.chain,
    tokenAddress: token.tokenAddress,
  });

export const getTokenPriceReferenceFromSeries = (
  series: FiatRateSeries | undefined,
  nowMs: number,
): TokenPriceReference | undefined => {
  const points = (series?.points || []).filter(
    point =>
      Number.isFinite(point?.ts) &&
      Number.isFinite(point?.rate) &&
      point.rate > 0,
  );
  const last = points[points.length - 1];
  if (!last || nowMs - last.ts > TOKEN_PRICE_REFERENCE_MAX_AGE_MS) {
    return undefined;
  }
  const first = points[0];
  return {
    usdPrice: last.rate,
    percentChange:
      first && first !== last
        ? ((last.rate - first.rate) / first.rate) * 100
        : undefined,
  };
};

/**
 * The live price, unless a recent BWS reference says it is off by more than
 * TOKEN_PRICE_MAX_DEVIATION.
 */
export const guardTokenUsdPrice = (args: {
  usdPrice: number;
  percentChange: number;
  reference?: TokenPriceReference;
}): {usdPrice: number; percentChange: number; replaced: boolean} => {
  const {reference} = args;
  const deviation =
    reference && reference.usdPrice > 0
      ? Math.abs(args.usdPrice / reference.usdPrice - 1)
      : 0;
  if (!reference || !(deviation > TOKEN_PRICE_MAX_DEVIATION)) {
    return {
      usdPrice: args.usdPrice,
      percentChange: args.percentChange,
      replaced: false,
    };
  }
  return {
    usdPrice: reference.usdPrice,
    // The live 24 h change was computed against the same wrong price.
    percentChange: reference.percentChange ?? 0,
    replaced: true,
  };
};

/**
 * BWS prices for the given tokens, from the portfolio's rate-series cache
 * (the Home chart reads the same 1D series, so this is usually a cache hit).
 * Tokens without a recent reference are left out. Resolves to whatever is
 * available — possibly nothing — and never rejects or waits past the timeout.
 */
export const loadTokenPriceReferences = async (args: {
  tokens: TokenPriceRef[];
  loadSeries: (args: {
    quoteCurrency: string;
    requests: FiatRateCacheRequest[];
    maxAgeMs?: number;
  }) => Promise<{[key in string]?: FiatRateSeries}>;
  nowMs?: () => number;
  timeoutMs?: number;
}): Promise<Map<TokenPriceRef, TokenPriceReference>> => {
  const references = new Map<TokenPriceRef, TokenPriceReference>();
  if (!args.tokens.length) {
    return references;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const cache = await Promise.race([
      args.loadSeries({
        quoteCurrency: 'USD',
        requests: args.tokens.map(token => ({
          coin: token.symbol,
          chain: token.chain,
          tokenAddress: token.tokenAddress,
          intervals: ['1D'],
        })),
        maxAgeMs: TOKEN_PRICE_REFERENCE_CACHE_MAX_AGE_MS,
      }),
      new Promise<undefined>(resolve => {
        timer = setTimeout(
          () => resolve(undefined),
          args.timeoutMs ?? TOKEN_PRICE_REFERENCE_TIMEOUT_MS,
        );
      }),
    ]);
    const now = (args.nowMs ?? Date.now)();
    for (const token of args.tokens) {
      const reference = getTokenPriceReferenceFromSeries(
        cache?.[getTokenPriceReferenceKey(token)],
        now,
      );
      if (reference) {
        references.set(token, reference);
      }
    }
  } catch {
    // No reference: live prices are used as they are.
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
  return references;
};
