import {PortfolioActionType, PortfolioActionTypes} from './portfolio.types';
import type {PortfolioState, WalletIdMap} from './portfolio.models';

type PortfolioReduxPersistBlackList = string[];
export const portfolioReduxPersistBlackList: PortfolioReduxPersistBlackList =
  [];

const initialState: PortfolioState = {
  lastPopulatedAt: undefined,
  lastFullPopulateCompletedAt: null,
  quoteCurrency: undefined,
  populateStatus: {
    inProgress: false,
    startedAt: undefined,
    finishedAt: undefined,
    elapsedMs: undefined,
    stopReason: undefined,
    currentWalletId: undefined,
    walletsTotal: 0,
    walletsCompleted: 0,
    txRequestsMade: 0,
    txsProcessed: 0,
    errors: [],
    walletStatusById: {},
  },
  snapshotBalanceMismatchesByWalletId: {},
  invalidDecimalsByWalletId: {},
  excessiveBalanceMismatchesByWalletId: {},
};

const isFiniteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const resolveQuote = (next?: string, current?: string): string =>
  String(next || current || 'USD') || 'USD';

const pickDefinedUpdate = <T, K extends keyof T>(
  updates: Partial<T>,
  current: T,
  key: K,
): T[K] =>
  typeof updates[key] !== 'undefined' ? (updates[key] as T[K]) : current[key];

const clearWalletIdsFromMap = <T>(
  current: WalletIdMap<T> | undefined,
  walletIds: string[],
): WalletIdMap<T> | undefined => {
  if (!current) {
    return undefined;
  }

  const next = {...current};
  for (const id of walletIds) {
    if (typeof id === 'string' && id) {
      delete next[id];
    }
  }
  return next;
};

const applyWalletIdMapUpdates = <T>(
  current: WalletIdMap<T> | undefined,
  updates: WalletIdMap<T> | undefined,
): WalletIdMap<T> => {
  const next = {...(current || {})};

  for (const [walletId, value] of Object.entries(updates || {})) {
    if (!walletId) {
      continue;
    }
    if (value) {
      next[walletId] = value;
    } else {
      delete next[walletId];
    }
  }

  return next;
};

export const portfolioReducer = (
  state: PortfolioState = initialState,
  action: PortfolioActionType,
): PortfolioState => {
  switch (action.type) {
    case PortfolioActionTypes.CLEAR_PORTFOLIO: {
      return {
        ...initialState,
        snapshotBalanceMismatchesByWalletId: {},
        invalidDecimalsByWalletId: {},
        excessiveBalanceMismatchesByWalletId: {},
      };
    }

    case PortfolioActionTypes.CANCEL_POPULATE_PORTFOLIO: {
      return {
        ...state,
        populateStatus: {
          ...initialState.populateStatus,
          stopReason: 'cancelled',
        },
      };
    }

    case PortfolioActionTypes.START_POPULATE_PORTFOLIO: {
      const startedAt = Date.now();
      return {
        ...state,
        populateStatus: {
          ...state.populateStatus,
          inProgress: true,
          startedAt,
          finishedAt: undefined,
          elapsedMs: undefined,
          stopReason: undefined,
          currentWalletId: undefined,
          walletsTotal: 0,
          walletsCompleted: 0,
          txRequestsMade: 0,
          txsProcessed: 0,
          errors: [],
          walletStatusById: {},
        },
      };
    }

    case PortfolioActionTypes.UPDATE_POPULATE_PROGRESS: {
      const nextErrors = action.payload.errorsToAdd?.length
        ? state.populateStatus.errors.concat(action.payload.errorsToAdd)
        : state.populateStatus.errors;

      const nextWalletStatusById = action.payload.walletStatusByIdUpdates
        ? {
            ...(state.populateStatus.walletStatusById || {}),
            ...action.payload.walletStatusByIdUpdates,
          }
        : state.populateStatus.walletStatusById;
      const nextProgressValue = <K extends keyof typeof state.populateStatus>(
        key: K,
      ) => pickDefinedUpdate(action.payload, state.populateStatus, key);
      return {
        ...state,
        populateStatus: {
          ...state.populateStatus,
          currentWalletId: nextProgressValue('currentWalletId'),
          walletsTotal: nextProgressValue('walletsTotal'),
          walletsCompleted: nextProgressValue('walletsCompleted'),
          txRequestsMade: nextProgressValue('txRequestsMade'),
          txsProcessed: nextProgressValue('txsProcessed'),
          errors: nextErrors,
          walletStatusById: nextWalletStatusById,
        },
      };
    }

    case PortfolioActionTypes.CLEAR_WALLET_PORTFOLIO_STATE: {
      const walletIds = Array.isArray(action.payload.walletIds)
        ? action.payload.walletIds
        : [];
      if (!walletIds.length) {
        return state;
      }

      const nextSnapshotBalanceMismatchesByWalletId = clearWalletIdsFromMap(
        state.snapshotBalanceMismatchesByWalletId || {},
        walletIds,
      );
      const nextInvalidDecimalsByWalletId = clearWalletIdsFromMap(
        state.invalidDecimalsByWalletId || {},
        walletIds,
      );
      const nextExcessiveBalanceMismatchesByWalletId = clearWalletIdsFromMap(
        state.excessiveBalanceMismatchesByWalletId || {},
        walletIds,
      );
      const nextWalletStatusById = clearWalletIdsFromMap(
        state.populateStatus.walletStatusById,
        walletIds,
      );

      const currentWalletId =
        state.populateStatus.currentWalletId &&
        walletIds.includes(state.populateStatus.currentWalletId)
          ? undefined
          : state.populateStatus.currentWalletId;

      return {
        ...state,
        populateStatus: {
          ...state.populateStatus,
          currentWalletId,
          walletStatusById: nextWalletStatusById,
        },
        snapshotBalanceMismatchesByWalletId:
          nextSnapshotBalanceMismatchesByWalletId,
        invalidDecimalsByWalletId: nextInvalidDecimalsByWalletId,
        excessiveBalanceMismatchesByWalletId:
          nextExcessiveBalanceMismatchesByWalletId,
      };
    }

    case PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES: {
      return {
        ...state,
        snapshotBalanceMismatchesByWalletId: applyWalletIdMapUpdates(
          state.snapshotBalanceMismatchesByWalletId,
          action.payload,
        ),
      };
    }

    case PortfolioActionTypes.SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES: {
      return {
        ...state,
        invalidDecimalsByWalletId: applyWalletIdMapUpdates(
          state.invalidDecimalsByWalletId,
          action.payload,
        ),
      };
    }

    case PortfolioActionTypes.SET_EXCESSIVE_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES: {
      return {
        ...state,
        excessiveBalanceMismatchesByWalletId: applyWalletIdMapUpdates(
          state.excessiveBalanceMismatchesByWalletId,
          action.payload,
        ),
      };
    }

    case PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO: {
      const finishedAt = action.payload.finishedAt;
      const quoteCurrency = action.payload.quoteCurrency;
      const startedAt = state.populateStatus.startedAt;
      const lastFullPopulateCompletedAt = isFiniteTimestamp(
        action.payload.lastFullPopulateCompletedAt,
      )
        ? action.payload.lastFullPopulateCompletedAt
        : isFiniteTimestamp(state.lastFullPopulateCompletedAt)
        ? state.lastFullPopulateCompletedAt
        : null;
      return {
        ...state,
        lastPopulatedAt: finishedAt,
        lastFullPopulateCompletedAt,
        quoteCurrency: resolveQuote(quoteCurrency, state.quoteCurrency),
        populateStatus: {
          ...state.populateStatus,
          inProgress: false,
          finishedAt,
          elapsedMs:
            typeof startedAt === 'number' ? finishedAt - startedAt : undefined,
          stopReason: action.payload.reason,
          currentWalletId: undefined,
          walletStatusById: {},
        },
      };
    }

    case PortfolioActionTypes.FAIL_POPULATE_PORTFOLIO: {
      const finishedAt = Date.now();
      const startedAt = state.populateStatus.startedAt;
      return {
        ...state,
        populateStatus: {
          ...state.populateStatus,
          inProgress: false,
          finishedAt,
          elapsedMs:
            typeof startedAt === 'number' ? finishedAt - startedAt : undefined,
          stopReason: action.payload.error,
          currentWalletId: undefined,
          errors: state.populateStatus.errors.concat({
            walletId: state.populateStatus.currentWalletId || 'unknown',
            message: action.payload.error,
          }),
          walletStatusById: {},
        },
      };
    }

    case PortfolioActionTypes.MARK_INITIAL_BASELINE_COMPLETE: {
      if (isFiniteTimestamp(state.lastFullPopulateCompletedAt)) {
        return state;
      }
      const quoteCurrency = action.payload.quoteCurrency;

      return {
        ...state,
        lastPopulatedAt: action.payload.completedAt,
        lastFullPopulateCompletedAt: action.payload.completedAt,
        quoteCurrency: resolveQuote(quoteCurrency, state.quoteCurrency),
      };
    }

    default:
      return state;
  }
};
