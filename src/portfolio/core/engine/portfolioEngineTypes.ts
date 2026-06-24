import type {SnapshotStreamCheckpoint} from '../pnl/snapshotStream';

export type SnapshotIngestConfig = {
  quoteCurrency: string;
  compressionEnabled: boolean;
  chunkRows: number;
};

export type PrepareWalletSessionResult = {
  checkpoint: SnapshotStreamCheckpoint;
};

export type FinishWalletSessionResult = {
  checkpoint: SnapshotStreamCheckpoint;
  appendedSnapshots: number;
};

export type ProcessNextPageSessionResult = {
  checkpoint: SnapshotStreamCheckpoint;
  appendedSnapshots: number;
  fetchedTxs: number;
  logicalPageSize: number;
  done: boolean;
  fetchMs: number;
  computeMs: number;
};

export type KvStats = {
  totalKeys: number;
  totalBytes: number;
  snapKeys: number;
  snapBytes: number;
  rateKeys: number;
  rateBytes: number;
  otherKeys: number;
  otherBytes: number;
};
