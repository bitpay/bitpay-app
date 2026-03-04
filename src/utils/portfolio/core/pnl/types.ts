export type BalanceSnapshotEventType = 'tx' | 'daily';

export interface BalanceSnapshotStored {
  // stored fields (persisted)
  id: string;
  walletId: string;
  chain: string;
  coin: string;
  network: string;
  assetId: string;

  // unix ms (UTC)
  timestamp: number;

  eventType: BalanceSnapshotEventType;
  // Only present when eventType === 'daily'. For eventType === 'tx', the txid is already in `id`.
  txIds?: string[];

  // Atomic integer as a *decimal string* (avoids precision loss for 1e18+ units).
  // This is friendlier for RN persistence than bigint.
  cryptoBalance: string;
  balanceDeltaAtomic?: string;

  // Total remaining fiat cost basis of the current holdings (quoteCurrency units).
  remainingCostBasisFiat: number;

  // Quote fiat currency for markRate + cost basis.
  quoteCurrency: string;

  // Exchange rate (fiat per 1 coin) nearest to timestamp.
  markRate: number;

  createdAt?: number; // unix ms
}

export interface BalanceSnapshotComputed extends BalanceSnapshotStored {
  // computed fields
  // Signed atomic delta vs the previous snapshot (as a decimal string).
  balanceDeltaAtomic: string;
  formattedCryptoBalance: string;
  fiatBalance: number;
  avgCostFiatPerUnit: number;
  unrealizedPnlFiat: number;
}
