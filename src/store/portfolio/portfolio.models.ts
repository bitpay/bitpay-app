export interface PortfolioPopulateError {
  walletId: string;
  message: string;
}

export type WalletPopulateState = 'in_progress' | 'done' | 'error';

export interface SnapshotBalanceMismatch {
  walletId: string;
  computedAtomic: string;
  currentAtomic: string;
  deltaAtomic: string;
  computedUnitsHeld: string;
  currentWalletBalance: string;
  delta: string;
}

export interface PortfolioPopulateStatus {
  inProgress: boolean;
  startedAt?: number;
  finishedAt?: number;
  elapsedMs?: number;
  stopReason?: string;
  currentWalletId?: string;
  walletsTotal: number;
  walletsCompleted: number;
  txRequestsMade: number;
  txsProcessed: number;
  errors: PortfolioPopulateError[];
  walletStatusById?: {[walletId: string]: WalletPopulateState | undefined};
}

export interface PortfolioState {
  lastPopulatedAt?: number;
  lastFullPopulateCompletedAt?: number | null;
  quoteCurrency?: string;
  populateStatus: PortfolioPopulateStatus;
  snapshotBalanceMismatchesByWalletId?: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  };
}
