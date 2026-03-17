import type {CachedBalanceChartTimeframe} from './portfolio-charts.models';
import {
  PortfolioChartsActionType,
  PortfolioChartsActionTypes,
} from './portfolio-charts.types';

export const clearPortfolioCharts = (): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.CLEAR_PORTFOLIO_CHARTS,
});

export const setHomeChartCollapsed = (
  payload: boolean,
): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.SET_HOME_CHART_COLLAPSED,
  payload,
});

export const upsertBalanceChartScopeTimeframes = (payload: {
  scopeId: string;
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset: number;
  timeframes: CachedBalanceChartTimeframe[];
  lastAccessedAt?: number;
}): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.UPSERT_BALANCE_CHART_SCOPE_TIMEFRAMES,
  payload,
});

export const patchBalanceChartScopeLatestPoints = (payload: {
  scopeId: string;
  timeframes: CachedBalanceChartTimeframe[];
  lastAccessedAt?: number;
}): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.PATCH_BALANCE_CHART_SCOPE_LATEST_POINTS,
  payload,
});

export const touchBalanceChartScope = (payload: {
  scopeId: string;
  lastAccessedAt?: number;
}): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.TOUCH_BALANCE_CHART_SCOPE,
  payload,
});

export const pruneBalanceChartCache = (payload?: {
  maxScopes?: number;
}): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.PRUNE_BALANCE_CHART_CACHE,
  payload,
});

export const removeBalanceChartScopesByWalletIds = (payload: {
  walletIds: string[];
}): PortfolioChartsActionType => ({
  type: PortfolioChartsActionTypes.REMOVE_BALANCE_CHART_SCOPES_BY_WALLET_IDS,
  payload,
});
