import type {FiatRateInterval} from '../../store/rate/rate.models';
import type {
  CachedBalanceChartTimeframe,
  HistoricalRateDependencyMeta,
} from '../../store/portfolio-charts';
import {
  patchCachedLatestPointWithSpotRates,
  type CachedTimeframeStatus,
} from '../../utils/portfolio/chartCache';

export type HydratedBalanceChartTimeframeUpdate<TSeries> = {
  series: TSeries;
  seriesRevision: string;
};

export const getEffectiveCachedBalanceChartTimeframe = (args: {
  cachedTimeframe: CachedBalanceChartTimeframe;
  status: CachedTimeframeStatus;
  currentSpotRatesByRateKey: Record<string, number>;
}): CachedBalanceChartTimeframe => {
  return args.status === 'patchable'
    ? patchCachedLatestPointWithSpotRates({
        cachedTimeframe: args.cachedTimeframe,
        currentSpotRatesByRateKey: args.currentSpotRatesByRateKey,
      })
    : args.cachedTimeframe;
};

export const buildHydratedBalanceChartTimeframes = <TSeries>(args: {
  timeframes?: Partial<Record<FiatRateInterval, CachedBalanceChartTimeframe>>;
  timeframeOrder: FiatRateInterval[];
  selectedTimeframe: FiatRateInterval;
  cachedStatusByTimeframe: Partial<
    Record<FiatRateInterval, CachedTimeframeStatus>
  >;
  currentSpotRatesByRateKey: Record<string, number>;
  deserializeTimeframe: (
    cachedTimeframe: CachedBalanceChartTimeframe,
  ) => TSeries;
  getTimeframeRevision: (
    timeframe: FiatRateInterval,
    historicalRateDeps: HistoricalRateDependencyMeta[],
  ) => string;
}): {
  patchedTimeframes: CachedBalanceChartTimeframe[];
  hydratedTimeframes: Partial<
    Record<FiatRateInterval, HydratedBalanceChartTimeframeUpdate<TSeries>>
  >;
  selectedHydratedSeries?: TSeries;
} => {
  const patchedTimeframes: CachedBalanceChartTimeframe[] = [];
  const hydratedTimeframes: Partial<
    Record<FiatRateInterval, HydratedBalanceChartTimeframeUpdate<TSeries>>
  > = {};
  let selectedHydratedSeries: TSeries | undefined;

  for (const timeframe of args.timeframeOrder) {
    const cachedTimeframe = args.timeframes?.[timeframe];
    if (!cachedTimeframe) {
      continue;
    }

    const status = args.cachedStatusByTimeframe[timeframe] || 'missing';
    const effectiveCachedTimeframe = getEffectiveCachedBalanceChartTimeframe({
      cachedTimeframe,
      status,
      currentSpotRatesByRateKey: args.currentSpotRatesByRateKey,
    });
    if (effectiveCachedTimeframe !== cachedTimeframe) {
      patchedTimeframes.push(effectiveCachedTimeframe);
    }

    const series = args.deserializeTimeframe(effectiveCachedTimeframe);
    hydratedTimeframes[timeframe] = {
      series,
      seriesRevision:
        status === 'fresh' || status === 'patchable'
          ? args.getTimeframeRevision(
              timeframe,
              effectiveCachedTimeframe.historicalRateDeps,
            )
          : `stale:${effectiveCachedTimeframe.builtAt}:${timeframe}`,
    };

    if (timeframe === args.selectedTimeframe) {
      selectedHydratedSeries = series;
    }
  }

  return {
    patchedTimeframes,
    hydratedTimeframes,
    selectedHydratedSeries,
  };
};
