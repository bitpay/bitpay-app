import type {GraphPoint} from 'react-native-graph';
import {FIAT_RATE_SERIES_TARGET_POINTS} from '../../store/rate/rate.models';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';

const DEFAULT_BALANCE_CHART_SCOPE_IDENTITY_KEY = 'balance_chart';

export const BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY = [
  'balance_history_chart',
  '3',
  String(FIAT_RATE_SERIES_TARGET_POINTS),
].join(':');

export const BALANCE_GAIN_LOSS_SUMMARY_SCOPE_IDENTITY_KEY =
  'balance_gain_loss_summary:3';

export type HydratedBalanceChartSeries = {
  graphPoints: GraphPoint[];
  analysisPoints: PnlAnalysisPoint[];
  pointByTimestamp: Map<number, PnlAnalysisPoint>;
  minIndex: number;
  maxIndex: number;
  minPoint: GraphPoint;
  maxPoint: GraphPoint;
  walletFiatBalanceByWalletId?: Record<string, number[]>;
  walletRemainingCostBasisFiatByWalletId?: Record<string, number[]>;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

export const normalizeBalanceChartOffset = (value: unknown): number => {
  return toFiniteNumber(value, 0);
};

// Sorting with localeCompare goes through ICU collation, which is costly on
// Android Hermes, and the same wallet lists are re-sorted on every render of
// the Home chart (~80 ms of a funded wallet's first render). Remember recent
// results by input; the order itself is unchanged, so chart scope ids — and
// the persisted chart caches keyed by them — stay the same.
const SORTED_WALLET_IDS_CACHE_MAX = 64;
const sortedWalletIdsCache = new Map<string, string[]>();

export const getSortedUniqueWalletIds = (walletIds: string[]): string[] => {
  const key = (walletIds || []).join('\u0000');
  const cached = sortedWalletIdsCache.get(key);
  if (cached) {
    return cached.slice();
  }
  const sorted = sortUniqueWalletIds(walletIds);
  if (sortedWalletIdsCache.size >= SORTED_WALLET_IDS_CACHE_MAX) {
    const oldest = sortedWalletIdsCache.keys().next().value;
    if (oldest !== undefined) {
      sortedWalletIdsCache.delete(oldest);
    }
  }
  sortedWalletIdsCache.set(key, sorted);
  return sorted.slice();
};

const sortUniqueWalletIds = (walletIds: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const walletId of walletIds || []) {
    const normalized = String(walletId || '');
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out.sort((a, b) => a.localeCompare(b));
};

export const buildBalanceChartScopeId = (args: {
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset?: number;
  scopeIdentityKey?: string;
}): string => {
  const walletIds = getSortedUniqueWalletIds(args.walletIds || []);
  const quoteCurrency = String(args.quoteCurrency || '').toUpperCase();
  const balanceOffset = normalizeBalanceChartOffset(args.balanceOffset);
  const scopeIdentityKey =
    String(args.scopeIdentityKey || '').trim() ||
    DEFAULT_BALANCE_CHART_SCOPE_IDENTITY_KEY;

  return [
    scopeIdentityKey,
    quoteCurrency,
    balanceOffset,
    walletIds.join(','),
  ].join('|');
};
