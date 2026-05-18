import type {
  ExcessiveBalanceMismatchMarker,
  InvalidDecimalsMarker,
  SnapshotBalanceMismatch,
  WalletIdMap,
  WalletPopulateState,
} from './portfolio.models';

export enum PortfolioActionTypes {
  CLEAR_PORTFOLIO = 'PORTFOLIO/CLEAR_PORTFOLIO',
  CANCEL_POPULATE_PORTFOLIO = 'PORTFOLIO/CANCEL_POPULATE_PORTFOLIO',
  START_POPULATE_PORTFOLIO = 'PORTFOLIO/START_POPULATE_PORTFOLIO',
  UPDATE_POPULATE_PROGRESS = 'PORTFOLIO/UPDATE_POPULATE_PROGRESS',
  CLEAR_WALLET_PORTFOLIO_STATE = 'PORTFOLIO/CLEAR_WALLET_PORTFOLIO_STATE',
  FINISH_POPULATE_PORTFOLIO = 'PORTFOLIO/FINISH_POPULATE_PORTFOLIO',
  FAIL_POPULATE_PORTFOLIO = 'PORTFOLIO/FAIL_POPULATE_PORTFOLIO',
  MARK_INITIAL_BASELINE_COMPLETE = 'PORTFOLIO/MARK_INITIAL_BASELINE_COMPLETE',
  SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES = 'PORTFOLIO/SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES',
  SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES = 'PORTFOLIO/SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES',
  SET_EXCESSIVE_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES = 'PORTFOLIO/SET_EXCESSIVE_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES',
}

export interface ClearPortfolioAction {
  type: typeof PortfolioActionTypes.CLEAR_PORTFOLIO;
}

export interface CancelPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.CANCEL_POPULATE_PORTFOLIO;
}

export interface StartPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.START_POPULATE_PORTFOLIO;
  payload: {
    quoteCurrency: string;
  };
}

export interface UpdatePopulateProgressAction {
  type: typeof PortfolioActionTypes.UPDATE_POPULATE_PROGRESS;
  payload: {
    currentWalletId?: string;
    walletsTotal?: number;
    walletsCompleted?: number;
    txRequestsMade?: number;
    txsProcessed?: number;
    errorsToAdd?: Array<{walletId: string; message: string}>;
    walletStatusByIdUpdates?: WalletIdMap<WalletPopulateState>;
  };
}

export interface ClearWalletPortfolioStateAction {
  type: typeof PortfolioActionTypes.CLEAR_WALLET_PORTFOLIO_STATE;
  payload: {
    walletIds: string[];
  };
}

export interface FinishPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO;
  payload: {
    finishedAt: number;
    lastFullPopulateCompletedAt?: number;
    reason: string;
    quoteCurrency: string;
  };
}

export interface FailPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.FAIL_POPULATE_PORTFOLIO;
  payload: {
    error: string;
  };
}

export interface MarkInitialBaselineCompleteAction {
  type: typeof PortfolioActionTypes.MARK_INITIAL_BASELINE_COMPLETE;
  payload: {
    completedAt: number;
    quoteCurrency: string;
  };
}

export interface SetSnapshotBalanceMismatchesByWalletIdUpdatesAction {
  type: typeof PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES;
  payload: WalletIdMap<SnapshotBalanceMismatch>;
}

export interface SetInvalidDecimalsByWalletIdUpdatesAction {
  type: typeof PortfolioActionTypes.SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES;
  payload: WalletIdMap<InvalidDecimalsMarker>;
}

export interface SetExcessiveBalanceMismatchesByWalletIdUpdatesAction {
  type: typeof PortfolioActionTypes.SET_EXCESSIVE_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES;
  payload: WalletIdMap<ExcessiveBalanceMismatchMarker>;
}

export type PortfolioActionType =
  | ClearPortfolioAction
  | CancelPopulatePortfolioAction
  | StartPopulatePortfolioAction
  | UpdatePopulateProgressAction
  | ClearWalletPortfolioStateAction
  | FinishPopulatePortfolioAction
  | FailPopulatePortfolioAction
  | MarkInitialBaselineCompleteAction
  | SetSnapshotBalanceMismatchesByWalletIdUpdatesAction
  | SetInvalidDecimalsByWalletIdUpdatesAction
  | SetExcessiveBalanceMismatchesByWalletIdUpdatesAction;
