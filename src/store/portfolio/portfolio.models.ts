export type BalanceSnapshotEventType = 'tx' | 'daily';
export type BalanceSnapshotDirection = 'incoming' | 'outgoing';

export interface BalanceSnapshot {
  id: string;
  chain: string;
  coin: string;
  network: string;
  assetId: string;
  timestamp: number;
  dayStartMs?: number;
  eventType: BalanceSnapshotEventType;
  txIds?: string[];
  direction?: BalanceSnapshotDirection;
  // Signed atomic delta vs the previous snapshot (computed, not persisted).
  balanceDeltaAtomic?: string;
  cryptoBalance: string;
  avgCostFiatPerUnit: number;
  remainingCostBasisFiat: number;
  unrealizedPnlFiat: number;
  costBasisRateFiat?: number;
  quoteCurrency: string;
  createdAt?: number;
}

export interface PortfolioPopulateError {
  walletId: string;
  message: string;
}

export type WalletPopulateState = 'in_progress' | 'done' | 'error';

export interface SnapshotBalanceMismatch {
  walletId: string;
  computedUnitsHeld: string;
  currentWalletBalance: string;
  delta: string;
}

export interface PortfolioPopulateStatus {
  inProgress: boolean;
  startedAt?: number;
  finishedAt?: number;
  elapsedMs?: number;
  currentWalletId?: string;
  walletsTotal: number;
  walletsCompleted: number;
  txRequestsMade: number;
  txsProcessed: number;
  errors: PortfolioPopulateError[];
  walletStatusById?: {[walletId: string]: WalletPopulateState | undefined};
}

export interface PortfolioState {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  lastPopulatedAt?: number;
  quoteCurrency?: string;
  populateStatus: PortfolioPopulateStatus;
  snapshotBalanceMismatchesByWalletId?: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  };
}
