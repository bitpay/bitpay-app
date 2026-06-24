import type {GraphPoint} from 'react-native-graph';
import {FIAT_RATE_SERIES_TARGET_POINTS} from '../../store/rate/rate.models';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';

const DEFAULT_BALANCE_CHART_SCOPE_IDENTITY_KEY = 'balance_chart';

export const BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY = [
  'balance_history_chart',
  '2',
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
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

export const normalizeBalanceChartOffset = (value: unknown): number => {
  return toFiniteNumber(value, 0);
};

export const getSortedUniqueWalletIds = (walletIds: string[]): string[] => {
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
