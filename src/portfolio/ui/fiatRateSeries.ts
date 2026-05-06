import type {FiatRateCacheRequest} from '../core/fiatRatesShared';
import type {FiatRateSeriesCache} from '../../store/rate/rate.models';
import {
  getPortfolioRateRuntimeClient,
  getPortfolioRuntimeClient,
} from '../runtime/portfolioRuntime';
import {
  buildFiatRateCacheRequestKey,
  normalizeFiatRateCacheRequests,
} from '../core/fiatRateIdentity';
import {createPortfolioQueryBwsConfig} from './common';

export const normalizeRuntimeFiatRateCacheRequests = (
  requests: FiatRateCacheRequest[],
): FiatRateCacheRequest[] => {
  return normalizeFiatRateCacheRequests(requests) as FiatRateCacheRequest[];
};

export const buildRuntimeFiatRateCacheRequestKey = (args: {
  quoteCurrency: string;
  requests: FiatRateCacheRequest[];
  maxAgeMs?: number;
}): string => {
  return buildFiatRateCacheRequestKey(args);
};

export async function loadRuntimeFiatRateSeriesCache(args: {
  quoteCurrency: string;
  requests: FiatRateCacheRequest[];
  maxAgeMs?: number;
  force?: boolean;
}): Promise<FiatRateSeriesCache> {
  const requests = normalizeRuntimeFiatRateCacheRequests(args.requests);
  if (!requests.length) {
    return {};
  }

  return getPortfolioRateRuntimeClient().getRateSeriesCache({
    cfg: createPortfolioQueryBwsConfig(),
    quoteCurrency: String(args.quoteCurrency || 'USD').toUpperCase(),
    requests,
    maxAgeMs: args.maxAgeMs,
    force: args.force,
  });
}

export async function replaceRuntimeFiatRateSeriesCache(args: {
  quoteCurrency: string;
  requests: FiatRateCacheRequest[];
  maxAgeMs?: number;
}): Promise<FiatRateSeriesCache> {
  const client = getPortfolioRuntimeClient();
  await client.clearRateStorage({});

  const requests = normalizeRuntimeFiatRateCacheRequests(args.requests);
  if (!requests.length) {
    return {};
  }

  return client.getRateSeriesCache({
    cfg: createPortfolioQueryBwsConfig(),
    quoteCurrency: String(args.quoteCurrency || 'USD').toUpperCase(),
    requests,
    maxAgeMs: args.maxAgeMs,
    force: true,
  });
}
