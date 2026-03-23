import type {
  FiatRateInterval,
  FiatRateSeriesCache,
} from '../../store/rate/rate.models';
import {
  getFiatRateSeriesAssetKey,
  getFiatRateSeriesCacheKey,
} from '../../store/rate/rate.models';
import type {
  BalanceSnapshot,
  BalanceSnapshotsByWalletId,
} from '../../store/portfolio/portfolio.models';
import type {Wallet} from '../../store/wallet/wallet.models';
import {
  getPortfolioWalletChainLower,
  getPortfolioWalletCurrencyAbbreviation,
  getPortfolioWalletTokenAddressNormalized,
} from '../../utils/portfolio/assets';
import {normalizeFiatRateSeriesCoin} from '../../utils/portfolio/core/pnl/rates';

const EMPTY_BALANCE_SNAPSHOTS: BalanceSnapshot[] = [];

export type BalanceHistoryChartRateFetchAsset = {
  coinForCacheCheck: string;
  chain?: string;
  tokenAddress?: string;
};

export const buildBalanceHistoryChartRateFetchAssets = (
  wallets?: Wallet[],
): BalanceHistoryChartRateFetchAsset[] => {
  const assets: BalanceHistoryChartRateFetchAsset[] = [];
  const seenAssetKeys = new Set<string>();

  for (const wallet of wallets || []) {
    const coinForCacheCheck = normalizeFiatRateSeriesCoin(
      getPortfolioWalletCurrencyAbbreviation(wallet),
    );
    if (!coinForCacheCheck) {
      continue;
    }

    const chainLower = getPortfolioWalletChainLower(wallet);
    const tokenAddress = getPortfolioWalletTokenAddressNormalized(wallet);
    const chain = tokenAddress ? chainLower || undefined : undefined;
    const assetKey = getFiatRateSeriesAssetKey(coinForCacheCheck, {
      chain,
      tokenAddress,
    });
    if (!assetKey || seenAssetKeys.has(assetKey)) {
      continue;
    }

    seenAssetKeys.add(assetKey);
    assets.push({
      coinForCacheCheck,
      chain,
      tokenAddress,
    });
  }

  return assets;
};

export const buildBalanceHistoryChartRelevantRateCacheAssets = (
  rateFetchAssets: BalanceHistoryChartRateFetchAsset[],
): Array<{
  coin: string;
  chain?: string;
  tokenAddress?: string;
}> => {
  return rateFetchAssets.map(asset => ({
    coin: asset.coinForCacheCheck,
    chain: asset.chain,
    tokenAddress: asset.tokenAddress,
  }));
};

export const buildBalanceHistoryChartPrepFiatRateSeriesCacheKeys = (args: {
  quoteCurrency: string;
  scopedSnapshotsByWalletId: BalanceSnapshotsByWalletId;
  prepIntervals: ReadonlyArray<FiatRateInterval>;
}): string[] => {
  const targetQuoteCurrency = (args.quoteCurrency || '').toUpperCase();
  if (!targetQuoteCurrency) {
    return [];
  }

  const quoteCurrencies = new Set<string>();
  let needsTargetQuoteCurrencySeries = false;

  for (const snapshots of Object.values(args.scopedSnapshotsByWalletId || {})) {
    for (const snapshot of snapshots || EMPTY_BALANCE_SNAPSHOTS) {
      const snapshotQuoteCurrency = (
        snapshot?.quoteCurrency || ''
      ).toUpperCase();
      if (
        !snapshotQuoteCurrency ||
        snapshotQuoteCurrency === targetQuoteCurrency
      ) {
        continue;
      }

      quoteCurrencies.add(snapshotQuoteCurrency);
      needsTargetQuoteCurrencySeries = true;
    }
  }

  if (!needsTargetQuoteCurrencySeries) {
    return [];
  }

  quoteCurrencies.add(targetQuoteCurrency);

  const keys = new Set<string>();
  for (const fiatCode of Array.from(quoteCurrencies).sort((a, b) =>
    a.localeCompare(b),
  )) {
    for (const interval of args.prepIntervals) {
      keys.add(getFiatRateSeriesCacheKey(fiatCode, 'btc', interval));
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
};

export const getLatestFiatRateSeriesPointTs = (
  cache?: FiatRateSeriesCache,
): number | undefined => {
  if (!cache) {
    return undefined;
  }

  let maxTs = 0;
  for (const cacheKey in cache) {
    if (!Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      continue;
    }

    const points = cache?.[cacheKey]?.points;
    if (!Array.isArray(points) || !points.length) {
      continue;
    }

    const lastTs = Number(points[points.length - 1]?.ts);
    if (Number.isFinite(lastTs) && lastTs > maxTs) {
      maxTs = lastTs;
    }
  }

  return maxTs > 0 ? maxTs : undefined;
};
