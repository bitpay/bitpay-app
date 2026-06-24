export type SnapshotCarryoverTx = {
  id: string;
  tsMs: number;
  blockHeight: number | null;
  txIndex: number | null;
  nonce: number | null;
  action: 'received' | 'sent' | 'moved' | 'unknown';
  absAmountAtomic: string;
  failed: boolean;
  baseFeeAtomic: string;
};

export type SnapshotStreamCheckpoint = {
  nextSkip: number;
  recentTxIds?: string[];
  carryoverGroup?: SnapshotCarryoverTx[];
  balanceAtomic: string;
  remainingCostBasisFiat: number;
  lastMarkRate: number;
  lastTimestamp: number;
  daily?: {
    dayIdx: number;
    lastTimestamp: number;
    lastMarkRate: number;
    balanceAtomic: string;
    remainingCostBasisFiat: number;
    txIds?: string[];
  };
  firstNonZeroTs?: number;
};
