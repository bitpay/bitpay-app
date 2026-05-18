import type {BalanceSnapshotStored} from './types';

export type SnapshotPersistDebugMode = 'none' | 'link' | 'full';

export type SnapshotPointV2 = {
  timestamp: number;
  cryptoBalance: string;
};

export type SnapshotPersistInputV2 = Pick<
  BalanceSnapshotStored,
  'timestamp' | 'cryptoBalance'
> &
  Partial<
    Pick<
      BalanceSnapshotStored,
      | 'id'
      | 'eventType'
      | 'txIds'
      | 'remainingCostBasisFiat'
      | 'markRate'
      | 'createdAt'
    >
  >;

export type SnapshotRowV2 = [timestamp: number, cryptoBalance: string];

export type SnapshotChunkV2 = {
  v: 2;
  rows: SnapshotRowV2[];
};

export type SnapshotChunkMetaV2 = {
  id: number;
  fromTs: number;
  toTs: number;
  rows: number;
};

export type SnapshotPopulateCheckpointV1 = {
  nextSkip: number;
  recentTxIds?: string[];
  carryoverGroup?: Array<{
    id: string;
    tsMs: number;
    blockHeight: number | null;
    txIndex: number | null;
    nonce: number | null;
    action: 'received' | 'sent' | 'moved' | 'unknown';
    absAmountAtomic: string;
    failed: boolean;
    baseFeeAtomic: string;
  }>;

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

export type SnapshotIndexV2 = {
  v: 2;
  walletId: string;
  compressionEnabled: boolean;
  chunkRows: number;
  chunks: SnapshotChunkMetaV2[];
  checkpoint: SnapshotPopulateCheckpointV1;
  updatedAt: number;
};

// Compatibility alias for callers that still import the older name.
export type SnapshotIndexV1 = SnapshotIndexV2;

export type SnapshotWalletMetaV2 = {
  walletId: string;
  chain: string;
  network: string;
  coin: string;
  assetId: string;
  quoteCurrency: string;
  unitDecimals?: number;
};

export type SnapshotStoreWalletMeta = {
  walletId: string;
  chain: string;
  network: string;
  currencyAbbreviation: string;
  tokenAddress?: string;
  unitDecimals?: number;
  quoteCurrency: string;
  compressionEnabled: boolean;
  chunkRows: number;
};
