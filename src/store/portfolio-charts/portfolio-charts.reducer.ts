import type {AnyAction} from 'redux';
import {RateActionTypes} from '../rate/rate.types';
import {PortfolioActionTypes} from '../portfolio/portfolio.types';
import type {
  CachedBalanceChartScope,
  CachedBalanceChartTimeframe,
  PortfolioChartsState,
} from './portfolio-charts.models';
import {
  BALANCE_CHART_CACHE_MAX_SCOPES,
  BALANCE_CHART_CACHE_SCHEMA_VERSION,
} from './portfolio-charts.models';
import {
  PortfolioChartsActionType,
  PortfolioChartsActionTypes,
} from './portfolio-charts.types';

export type PortfolioChartsReduxPersistBlackList = string[];
export const portfolioChartsReduxPersistBlackList: PortfolioChartsReduxPersistBlackList =
  [];

const initialState: PortfolioChartsState = {
  homeChartCollapsed: false,
  homeChartRemountNonce: 0,
  walletSnapshotVersionById: {},
  cacheByScopeId: {},
  lruScopeIds: [],
};

const normalizeWalletIds = (walletIds: string[]): string[] => {
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

const normalizeBalanceOffset = (value: number): number => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const touchScopeId = (lruScopeIds: string[], scopeId: string): string[] => {
  if (!scopeId) {
    return lruScopeIds;
  }
  const next = lruScopeIds.filter(id => id !== scopeId);
  next.unshift(scopeId);
  return next;
};

const dedupeLruScopeIds = (lruScopeIds: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const scopeId of lruScopeIds) {
    if (seen.has(scopeId)) {
      continue;
    }
    seen.add(scopeId);
    next.push(scopeId);
  }

  return next;
};

const pruneCacheState = (
  state: PortfolioChartsState,
  maxScopes = BALANCE_CHART_CACHE_MAX_SCOPES,
): PortfolioChartsState => {
  const effectiveMax = Math.max(1, Math.floor(maxScopes || 1));
  const dedupedLruScopeIds = dedupeLruScopeIds(state.lruScopeIds);

  if (dedupedLruScopeIds.length <= effectiveMax) {
    if (dedupedLruScopeIds.length === state.lruScopeIds.length) {
      return state;
    }

    return {
      ...state,
      lruScopeIds: dedupedLruScopeIds,
    };
  }

  const keepScopeIds = dedupedLruScopeIds.slice(0, effectiveMax);
  const nextCacheByScopeId: PortfolioChartsState['cacheByScopeId'] = {};

  for (const scopeId of keepScopeIds) {
    const scope = state.cacheByScopeId[scopeId];
    if (scope) {
      nextCacheByScopeId[scopeId] = scope;
    }
  }

  return {
    ...state,
    cacheByScopeId: nextCacheByScopeId,
    lruScopeIds: keepScopeIds,
  };
};

const removeScopesForWalletIds = (
  state: PortfolioChartsState,
  walletIds: string[],
): PortfolioChartsState => {
  const targetWalletIds = new Set(normalizeWalletIds(walletIds));
  if (!targetWalletIds.size) {
    return state;
  }

  const nextCacheByScopeId = {...state.cacheByScopeId};
  const nextLruScopeIds: string[] = [];

  for (const scopeId of state.lruScopeIds) {
    const scope = nextCacheByScopeId[scopeId];
    const includesWallet = scope?.walletIds?.some(walletId =>
      targetWalletIds.has(walletId),
    );
    if (includesWallet) {
      delete nextCacheByScopeId[scopeId];
      continue;
    }
    nextLruScopeIds.push(scopeId);
  }

  return {
    ...state,
    cacheByScopeId: nextCacheByScopeId,
    lruScopeIds: nextLruScopeIds,
  };
};

const sanitizeTimeframe = (
  timeframe: CachedBalanceChartTimeframe,
): CachedBalanceChartTimeframe => ({
  ...timeframe,
  schemaVersion:
    typeof timeframe?.schemaVersion === 'number'
      ? timeframe.schemaVersion
      : BALANCE_CHART_CACHE_SCHEMA_VERSION,
  balanceOffset: normalizeBalanceOffset(timeframe?.balanceOffset ?? 0),
  walletIds: normalizeWalletIds(timeframe?.walletIds || []),
  historicalRateDeps: Array.isArray(timeframe?.historicalRateDeps)
    ? timeframe.historicalRateDeps.filter(dep => !!dep?.cacheKey)
    : [],
  lastSpotRatesByRateKey: {...(timeframe?.lastSpotRatesByRateKey || {})},
  latestHoldingsByRateKey: {...(timeframe?.latestHoldingsByRateKey || {})},
  ts: Array.isArray(timeframe?.ts) ? timeframe.ts.slice() : [],
  totalFiatBalance: Array.isArray(timeframe?.totalFiatBalance)
    ? timeframe.totalFiatBalance.slice()
    : [],
  totalUnrealizedPnlFiat: Array.isArray(timeframe?.totalUnrealizedPnlFiat)
    ? timeframe.totalUnrealizedPnlFiat.slice()
    : [],
  totalPnlPercent: Array.isArray(timeframe?.totalPnlPercent)
    ? timeframe.totalPnlPercent.slice()
    : [],
});

const upsertScopeTimeframes = (
  state: PortfolioChartsState,
  args: {
    scopeId: string;
    walletIds?: string[];
    quoteCurrency?: string;
    balanceOffset?: number;
    timeframes: CachedBalanceChartTimeframe[];
    lastAccessedAt?: number;
  },
): PortfolioChartsState => {
  const scopeId = String(args.scopeId || '');
  if (!scopeId) {
    return state;
  }

  const existingScope = state.cacheByScopeId[scopeId];
  const nextTimeframes = {
    ...(existingScope?.timeframes || {}),
  } as CachedBalanceChartScope['timeframes'];

  for (const timeframe of args.timeframes || []) {
    if (!timeframe?.timeframe) {
      continue;
    }
    nextTimeframes[timeframe.timeframe] = sanitizeTimeframe(timeframe);
  }

  const nextScope: CachedBalanceChartScope = {
    scopeId,
    walletIds: normalizeWalletIds(
      args.walletIds || existingScope?.walletIds || [],
    ),
    quoteCurrency: String(
      args.quoteCurrency || existingScope?.quoteCurrency || '',
    ).toUpperCase(),
    balanceOffset: normalizeBalanceOffset(
      args.balanceOffset ?? existingScope?.balanceOffset ?? 0,
    ),
    lastAccessedAt:
      typeof args.lastAccessedAt === 'number'
        ? args.lastAccessedAt
        : Date.now(),
    timeframes: nextTimeframes,
  };

  return pruneCacheState({
    ...state,
    cacheByScopeId: {
      ...state.cacheByScopeId,
      [scopeId]: nextScope,
    },
    lruScopeIds: touchScopeId(state.lruScopeIds, scopeId),
  });
};

export const portfolioChartsReducer = (
  state: PortfolioChartsState = initialState,
  action: PortfolioChartsActionType | AnyAction,
): PortfolioChartsState => {
  switch (action.type) {
    case PortfolioChartsActionTypes.CLEAR_PORTFOLIO_CHARTS:
    case PortfolioActionTypes.CLEAR_PORTFOLIO:
      return {
        ...initialState,
        homeChartRemountNonce: (state.homeChartRemountNonce || 0) + 1,
      };

    case PortfolioChartsActionTypes.SET_HOME_CHART_COLLAPSED:
      return {
        ...state,
        homeChartCollapsed: !!action.payload,
      };

    case PortfolioChartsActionTypes.UPSERT_BALANCE_CHART_SCOPE_TIMEFRAMES:
      return upsertScopeTimeframes(state, action.payload || {timeframes: []});

    case PortfolioChartsActionTypes.PATCH_BALANCE_CHART_SCOPE_LATEST_POINTS: {
      const scopeId = String(action.payload?.scopeId || '');
      const existingScope = state.cacheByScopeId[scopeId];
      if (!scopeId || !existingScope) {
        return state;
      }
      return upsertScopeTimeframes(state, {
        scopeId,
        walletIds: existingScope.walletIds,
        quoteCurrency: existingScope.quoteCurrency,
        balanceOffset: existingScope.balanceOffset,
        timeframes: action.payload?.timeframes || [],
        lastAccessedAt: action.payload?.lastAccessedAt,
      });
    }

    case PortfolioChartsActionTypes.TOUCH_BALANCE_CHART_SCOPE: {
      const scopeId = String(action.payload?.scopeId || '');
      const scope = state.cacheByScopeId[scopeId];
      if (!scopeId || !scope) {
        return state;
      }

      return pruneCacheState({
        ...state,
        cacheByScopeId: {
          ...state.cacheByScopeId,
          [scopeId]: {
            ...scope,
            lastAccessedAt:
              typeof action.payload?.lastAccessedAt === 'number'
                ? action.payload.lastAccessedAt
                : Date.now(),
          },
        },
        lruScopeIds: touchScopeId(state.lruScopeIds, scopeId),
      });
    }

    case PortfolioChartsActionTypes.PRUNE_BALANCE_CHART_CACHE:
      return pruneCacheState(
        state,
        action.payload?.maxScopes ?? BALANCE_CHART_CACHE_MAX_SCOPES,
      );

    case PortfolioChartsActionTypes.REMOVE_BALANCE_CHART_SCOPES_BY_WALLET_IDS:
      return removeScopesForWalletIds(state, action.payload?.walletIds || []);

    case PortfolioActionTypes.SET_WALLET_SNAPSHOTS: {
      const walletId = String(action.payload?.walletId || '');
      if (!walletId) {
        return state;
      }
      const prevVersion = state.walletSnapshotVersionById[walletId] || 0;
      return {
        ...state,
        walletSnapshotVersionById: {
          ...state.walletSnapshotVersionById,
          [walletId]: prevVersion + 1,
        },
      };
    }

    case PortfolioActionTypes.REMOVE_WALLET_SNAPSHOTS: {
      const walletIds = normalizeWalletIds(action.payload?.walletIds || []);
      if (!walletIds.length) {
        return state;
      }

      const nextState = removeScopesForWalletIds(state, walletIds);
      const nextWalletSnapshotVersionById = {
        ...nextState.walletSnapshotVersionById,
      };
      for (const walletId of walletIds) {
        delete nextWalletSnapshotVersionById[walletId];
      }
      return {
        ...nextState,
        walletSnapshotVersionById: nextWalletSnapshotVersionById,
      };
    }

    case RateActionTypes.CLEAR_RATE_STATE:
      return {
        ...state,
        cacheByScopeId: {},
        lruScopeIds: [],
      };

    default:
      return state;
  }
};
