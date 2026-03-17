import type {FiatRateInterval} from '../rate/rate.models';

export const BALANCE_CHART_CACHE_SCHEMA_VERSION = 4;
export const BALANCE_CHART_CACHE_MAX_SCOPES = 40;

export type HistoricalRateDependencyMeta = {
  cacheKey: string;
  fetchedOn?: number;
  lastTs?: number;
};

export type LatestHoldingsByRateKey = Record<
  string,
  {
    units: number;
  }
>;

export type CachedBalanceChartTimeframe = {
  timeframe: FiatRateInterval;
  builtAt: number;
  schemaVersion: number;

  quoteCurrency: string;
  balanceOffset: number;
  walletIds: string[];

  snapshotVersionSig: string;
  historicalRateDeps: HistoricalRateDependencyMeta[];

  lastSpotRatesByRateKey: Record<string, number>;
  latestHoldingsByRateKey: LatestHoldingsByRateKey;
  latestRemainingCostBasisFiatTotal: number;

  ts: number[];
  totalFiatBalance: number[];
  totalUnrealizedPnlFiat: number[];
  totalPnlPercent: number[];
  minTotalFiatBalance?: number;
  minTotalFiatBalanceTs?: number;
  maxTotalFiatBalance?: number;
  maxTotalFiatBalanceTs?: number;
  minTotalFiatBalanceExcludingEnd?: number;
  minTotalFiatBalanceExcludingEndTs?: number;
  maxTotalFiatBalanceExcludingEnd?: number;
  maxTotalFiatBalanceExcludingEndTs?: number;
};

export type CachedBalanceChartTimeframes = Partial<
  Record<FiatRateInterval, CachedBalanceChartTimeframe>
>;

export type CachedBalanceChartScope = {
  scopeId: string;
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset: number;
  lastAccessedAt: number;
  timeframes: CachedBalanceChartTimeframes;
};

export interface PortfolioChartsState {
  homeChartCollapsed: boolean;
  homeChartRemountNonce: number;
  walletSnapshotVersionById: Record<string, number | undefined>;
  cacheByScopeId: Record<string, CachedBalanceChartScope | undefined>;
  lruScopeIds: string[];
}
