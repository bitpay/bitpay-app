import type {
  InvalidDecimalsMarker,
  PortfolioQuarantineMarker,
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
  SET_QUARANTINES_BY_WALLET_ID_UPDATES = 'PORTFOLIO/SET_QUARANTINES_BY_WALLET_ID_UPDATES',
}

type PortfolioAction<T extends PortfolioActionTypes> = {type: T};

type PortfolioPayloadAction<
  T extends PortfolioActionTypes,
  P,
> = PortfolioAction<T> & {payload: P};

export type PortfolioActionType =
  | PortfolioAction<PortfolioActionTypes.CLEAR_PORTFOLIO>
  | PortfolioAction<PortfolioActionTypes.CANCEL_POPULATE_PORTFOLIO>
  | PortfolioPayloadAction<
      PortfolioActionTypes.START_POPULATE_PORTFOLIO,
      {quoteCurrency: string}
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.UPDATE_POPULATE_PROGRESS,
      {
        currentWalletId?: string;
        walletsTotal?: number;
        walletsCompleted?: number;
        txRequestsMade?: number;
        txsProcessed?: number;
        errorsToAdd?: Array<{walletId: string; message: string}>;
        walletStatusByIdUpdates?: WalletIdMap<WalletPopulateState>;
      }
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.CLEAR_WALLET_PORTFOLIO_STATE,
      {walletIds: string[]}
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.FINISH_POPULATE_PORTFOLIO,
      {
        finishedAt: number;
        lastFullPopulateCompletedAt?: number;
        reason: string;
        quoteCurrency: string;
      }
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.FAIL_POPULATE_PORTFOLIO,
      {error: string}
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.MARK_INITIAL_BASELINE_COMPLETE,
      {completedAt: number; quoteCurrency: string}
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.SET_SNAPSHOT_BALANCE_MISMATCHES_BY_WALLET_ID_UPDATES,
      WalletIdMap<SnapshotBalanceMismatch>
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.SET_INVALID_DECIMALS_BY_WALLET_ID_UPDATES,
      WalletIdMap<InvalidDecimalsMarker>
    >
  | PortfolioPayloadAction<
      PortfolioActionTypes.SET_QUARANTINES_BY_WALLET_ID_UPDATES,
      WalletIdMap<PortfolioQuarantineMarker>
    >;
