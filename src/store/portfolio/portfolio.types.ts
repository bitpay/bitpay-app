import type {
  BalanceSnapshot,
  SnapshotBalanceMismatch,
  WalletPopulateState,
} from './portfolio.models';

export enum PortfolioActionTypes {
  CLEAR_PORTFOLIO = 'PORTFOLIO/CLEAR_PORTFOLIO',
  CANCEL_POPULATE_PORTFOLIO = 'PORTFOLIO/CANCEL_POPULATE_PORTFOLIO',
  START_POPULATE_PORTFOLIO = 'PORTFOLIO/START_POPULATE_PORTFOLIO',
  UPDATE_POPULATE_PROGRESS = 'PORTFOLIO/UPDATE_POPULATE_PROGRESS',
  SET_WALLET_SNAPSHOTS = 'PORTFOLIO/SET_WALLET_SNAPSHOTS',
  REMOVE_WALLET_SNAPSHOTS = 'PORTFOLIO/REMOVE_WALLET_SNAPSHOTS',
  FINISH_POPULATE_PORTFOLIO = 'PORTFOLIO/FINISH_POPULATE_PORTFOLIO',
  FAIL_POPULATE_PORTFOLIO = 'PORTFOLIO/FAIL_POPULATE_PORTFOLIO',
  SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES = 'PORTFOLIO/SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES',
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
    walletStatusByIdUpdates?: {
      [walletId: string]: WalletPopulateState | undefined;
    };
  };
}

export interface SetWalletSnapshotsAction {
  type: typeof PortfolioActionTypes.SET_WALLET_SNAPSHOTS;
  payload: {
    walletId: string;
    snapshots: BalanceSnapshot[];
  };
}

export interface RemoveWalletSnapshotsAction {
  type: typeof PortfolioActionTypes.REMOVE_WALLET_SNAPSHOTS;
  payload: {
    walletIds: string[];
  };
}

export interface FinishPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO;
  payload: {
    finishedAt: number;
  };
}

export interface FailPopulatePortfolioAction {
  type: typeof PortfolioActionTypes.FAIL_POPULATE_PORTFOLIO;
  payload: {
    error: string;
  };
}

export interface SetSnapshotBalanceMismatchesByWalletIdUpdatesAction {
  type: typeof PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES;
  payload: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  };
}

export type PortfolioActionType =
  | ClearPortfolioAction
  | CancelPopulatePortfolioAction
  | StartPopulatePortfolioAction
  | UpdatePopulateProgressAction
  | SetWalletSnapshotsAction
  | RemoveWalletSnapshotsAction
  | FinishPopulatePortfolioAction
  | FailPopulatePortfolioAction
  | SetSnapshotBalanceMismatchesByWalletIdUpdatesAction;
