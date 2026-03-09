import type {
  BalanceSnapshot,
  SnapshotBalanceMismatch,
} from './portfolio.models';
import {PortfolioActionType, PortfolioActionTypes} from './portfolio.types';

export const clearPortfolio = (): PortfolioActionType => ({
  type: PortfolioActionTypes.CLEAR_PORTFOLIO,
});

export const cancelPopulatePortfolio = (): PortfolioActionType => ({
  type: PortfolioActionTypes.CANCEL_POPULATE_PORTFOLIO,
});

export const startPopulatePortfolio = (payload: {
  quoteCurrency: string;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.START_POPULATE_PORTFOLIO,
  payload,
});

export const updatePopulateProgress = (payload: {
  currentWalletId?: string;
  walletsTotal?: number;
  walletsCompleted?: number;
  txRequestsMade?: number;
  txsProcessed?: number;
  errorsToAdd?: Array<{walletId: string; message: string}>;
  walletStatusByIdUpdates?: {
    [walletId: string]: 'in_progress' | 'done' | 'error' | undefined;
  };
}): PortfolioActionType => ({
  type: PortfolioActionTypes.UPDATE_POPULATE_PROGRESS,
  payload,
});

export const setWalletSnapshots = (payload: {
  walletId: string;
  snapshots: BalanceSnapshot[];
}): PortfolioActionType => ({
  type: PortfolioActionTypes.SET_WALLET_SNAPSHOTS,
  payload,
});

export const removeWalletSnapshots = (payload: {
  walletIds: string[];
}): PortfolioActionType => ({
  type: PortfolioActionTypes.REMOVE_WALLET_SNAPSHOTS,
  payload,
});

export const finishPopulatePortfolio = (payload: {
  finishedAt: number;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO,
  payload,
});

export const failPopulatePortfolio = (payload: {
  error: string;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.FAIL_POPULATE_PORTFOLIO,
  payload,
});

export const setSnapshotBalanceMismatchesByWalletIdUpdates = (payload: {
  [walletId: string]: SnapshotBalanceMismatch | undefined;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES,
  payload,
});
