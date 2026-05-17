import type {
  ExcessiveBalanceMismatchMarker,
  InvalidDecimalsMarker,
  SnapshotBalanceMismatch,
  WalletIdMap,
  WalletPopulateState,
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
  walletStatusByIdUpdates?: WalletIdMap<WalletPopulateState>;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.UPDATE_POPULATE_PROGRESS,
  payload,
});

export const clearWalletPortfolioState = (payload: {
  walletIds: string[];
}): PortfolioActionType => ({
  type: PortfolioActionTypes.CLEAR_WALLET_PORTFOLIO_STATE,
  payload,
});

export const finishPopulatePortfolio = (payload: {
  finishedAt: number;
  lastFullPopulateCompletedAt?: number;
  reason: string;
  quoteCurrency: string;
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

export const markInitialBaselineComplete = (payload: {
  completedAt: number;
  quoteCurrency: string;
}): PortfolioActionType => ({
  type: PortfolioActionTypes.MARK_INITIAL_BASELINE_COMPLETE,
  payload,
});

export const setSnapshotBalanceMismatchesByWalletIdUpdates = (
  payload: WalletIdMap<SnapshotBalanceMismatch>,
): PortfolioActionType => ({
  type: PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES,
  payload,
});

export const setInvalidDecimalsByWalletIdUpdates = (
  payload: WalletIdMap<InvalidDecimalsMarker>,
): PortfolioActionType => ({
  type: PortfolioActionTypes.SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES,
  payload,
});

export const setExcessiveBalanceMismatchesByWalletIdUpdates = (
  payload: WalletIdMap<ExcessiveBalanceMismatchMarker>,
): PortfolioActionType => ({
  type: PortfolioActionTypes.SET_EXCESSIVE_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES,
  payload,
});
