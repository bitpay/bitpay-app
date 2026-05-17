export interface PortfolioPopulateError {
  walletId: string;
  message: string;
}

export type WalletPopulateState = 'in_progress' | 'done' | 'error';

export type WalletIdMap<T> = {[walletId: string]: T | undefined};

export interface SnapshotBalanceMismatch {
  walletId: string;
  computedAtomic: string;
  currentAtomic: string;
  deltaAtomic: string;
  computedUnitsHeld: string;
  currentWalletBalance: string;
  delta: string;
}

export interface InvalidDecimalsMarker {
  walletId: string;
  reason: 'invalid_decimals';
  message: string;
}

export interface ExcessiveBalanceMismatchMarker {
  walletId: string;
  reason: 'excessive_balance_mismatch';
  computedAtomic: string;
  liveAtomic: string;
  deltaAtomic: string;
  ratio: string;
  threshold: number;
  detectedAt: number;
  lastAttemptedAt?: number;
  message: string;
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
  walletStatusById?: WalletIdMap<WalletPopulateState>;
}

export interface PortfolioState {
  lastPopulatedAt?: number;
  lastFullPopulateCompletedAt?: number | null;
  quoteCurrency?: string;
  populateStatus: PortfolioPopulateStatus;
  snapshotBalanceMismatchesByWalletId?: WalletIdMap<SnapshotBalanceMismatch>;
  invalidDecimalsByWalletId?: WalletIdMap<InvalidDecimalsMarker>;
  excessiveBalanceMismatchesByWalletId?: WalletIdMap<ExcessiveBalanceMismatchMarker>;
}
