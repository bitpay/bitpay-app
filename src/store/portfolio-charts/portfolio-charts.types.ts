import type {CachedBalanceChartTimeframe} from './portfolio-charts.models';

export enum PortfolioChartsActionTypes {
  CLEAR_PORTFOLIO_CHARTS = 'PORTFOLIO_CHARTS/CLEAR_PORTFOLIO_CHARTS',
  SET_HOME_CHART_COLLAPSED = 'PORTFOLIO_CHARTS/SET_HOME_CHART_COLLAPSED',
  UPSERT_BALANCE_CHART_SCOPE_TIMEFRAMES = 'PORTFOLIO_CHARTS/UPSERT_BALANCE_CHART_SCOPE_TIMEFRAMES',
  PATCH_BALANCE_CHART_SCOPE_LATEST_POINTS = 'PORTFOLIO_CHARTS/PATCH_BALANCE_CHART_SCOPE_LATEST_POINTS',
  TOUCH_BALANCE_CHART_SCOPE = 'PORTFOLIO_CHARTS/TOUCH_BALANCE_CHART_SCOPE',
  PRUNE_BALANCE_CHART_CACHE = 'PORTFOLIO_CHARTS/PRUNE_BALANCE_CHART_CACHE',
  REMOVE_BALANCE_CHART_SCOPES_BY_WALLET_IDS = 'PORTFOLIO_CHARTS/REMOVE_BALANCE_CHART_SCOPES_BY_WALLET_IDS',
}

export interface ClearPortfolioChartsAction {
  type: typeof PortfolioChartsActionTypes.CLEAR_PORTFOLIO_CHARTS;
}

export interface SetHomeChartCollapsedAction {
  type: typeof PortfolioChartsActionTypes.SET_HOME_CHART_COLLAPSED;
  payload: boolean;
}

export interface UpsertBalanceChartScopeTimeframesAction {
  type: typeof PortfolioChartsActionTypes.UPSERT_BALANCE_CHART_SCOPE_TIMEFRAMES;
  payload: {
    scopeId: string;
    walletIds: string[];
    quoteCurrency: string;
    balanceOffset: number;
    timeframes: CachedBalanceChartTimeframe[];
    lastAccessedAt?: number;
  };
}

export interface PatchBalanceChartScopeLatestPointsAction {
  type: typeof PortfolioChartsActionTypes.PATCH_BALANCE_CHART_SCOPE_LATEST_POINTS;
  payload: {
    scopeId: string;
    timeframes: CachedBalanceChartTimeframe[];
    lastAccessedAt?: number;
  };
}

export interface TouchBalanceChartScopeAction {
  type: typeof PortfolioChartsActionTypes.TOUCH_BALANCE_CHART_SCOPE;
  payload: {
    scopeId: string;
    lastAccessedAt?: number;
  };
}

export interface PruneBalanceChartCacheAction {
  type: typeof PortfolioChartsActionTypes.PRUNE_BALANCE_CHART_CACHE;
  payload?: {
    maxScopes?: number;
  };
}

export interface RemoveBalanceChartScopesByWalletIdsAction {
  type: typeof PortfolioChartsActionTypes.REMOVE_BALANCE_CHART_SCOPES_BY_WALLET_IDS;
  payload: {
    walletIds: string[];
  };
}

export type PortfolioChartsActionType =
  | ClearPortfolioChartsAction
  | SetHomeChartCollapsedAction
  | UpsertBalanceChartScopeTimeframesAction
  | PatchBalanceChartScopeLatestPointsAction
  | TouchBalanceChartScopeAction
  | PruneBalanceChartCacheAction
  | RemoveBalanceChartScopesByWalletIdsAction;
