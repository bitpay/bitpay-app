export type PortfolioPopulateWalletDebugTrace = {
  walletId: string;
  snapshotDebugMode: 'none' | 'link' | 'full';
  capturedAtMs: number;
  fetchedTxRows: unknown[];
  processedTxRows: unknown[];
  emittedSnapshotRows: unknown[];
};
