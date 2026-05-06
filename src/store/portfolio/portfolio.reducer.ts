import {PortfolioActionType, PortfolioActionTypes} from './portfolio.types';
import type {PortfolioState} from './portfolio.models';

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
};

const isFiniteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const portfolioReducer = (
  state: PortfolioState = initialState,
  action: PortfolioActionType,
): PortfolioState => {
  switch (action.type) {
    case PortfolioActionTypes.CLEAR_PORTFOLIO: {
      return {
        ...initialState,
        snapshotBalanceMismatchesByWalletId: {},
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
      return {
        ...state,
        populateStatus: {
          ...state.populateStatus,
          currentWalletId:
            typeof action.payload.currentWalletId !== 'undefined'
              ? action.payload.currentWalletId
              : state.populateStatus.currentWalletId,
          walletsTotal:
            typeof action.payload.walletsTotal !== 'undefined'
              ? action.payload.walletsTotal
              : state.populateStatus.walletsTotal,
          walletsCompleted:
            typeof action.payload.walletsCompleted !== 'undefined'
              ? action.payload.walletsCompleted
              : state.populateStatus.walletsCompleted,
          txRequestsMade:
            typeof action.payload.txRequestsMade !== 'undefined'
              ? action.payload.txRequestsMade
              : state.populateStatus.txRequestsMade,
          txsProcessed:
            typeof action.payload.txsProcessed !== 'undefined'
              ? action.payload.txsProcessed
              : state.populateStatus.txsProcessed,
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

      const nextSnapshotBalanceMismatchesByWalletId = {
        ...(state.snapshotBalanceMismatchesByWalletId || {}),
      };
      for (const id of walletIds) {
        if (typeof id === 'string' && id) {
          delete nextSnapshotBalanceMismatchesByWalletId[id];
        }
      }

      const nextWalletStatusById = state.populateStatus.walletStatusById
        ? {...state.populateStatus.walletStatusById}
        : undefined;
      if (nextWalletStatusById) {
        for (const id of walletIds) {
          if (typeof id === 'string' && id) {
            delete nextWalletStatusById[id];
          }
        }
      }

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
      };
    }

    case PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES: {
      const updates = action.payload || {};
      const nextSnapshotBalanceMismatchesByWalletId = {
        ...(state.snapshotBalanceMismatchesByWalletId || {}),
      };

      for (const [walletId, mismatch] of Object.entries(updates)) {
        if (!walletId) {
          continue;
        }
        if (mismatch) {
          nextSnapshotBalanceMismatchesByWalletId[walletId] = mismatch;
        } else {
          delete nextSnapshotBalanceMismatchesByWalletId[walletId];
        }
      }

      return {
        ...state,
        snapshotBalanceMismatchesByWalletId:
          nextSnapshotBalanceMismatchesByWalletId,
      };
    }

    case PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO: {
      const finishedAt = action.payload.finishedAt;
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
        quoteCurrency:
          String(
            action.payload.quoteCurrency || state.quoteCurrency || 'USD',
          ) || 'USD',
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

      return {
        ...state,
        lastPopulatedAt: action.payload.completedAt,
        lastFullPopulateCompletedAt: action.payload.completedAt,
        quoteCurrency:
          String(
            action.payload.quoteCurrency || state.quoteCurrency || 'USD',
          ) || 'USD',
      };
    }

    default:
      return state;
  }
};
