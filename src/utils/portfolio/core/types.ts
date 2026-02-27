export type WalletCredentials = Record<string, any>;

export type WalletSummary = {
  walletId: string;
  walletName: string;
  chain: string; // e.g. btc, eth, sol
  network: string; // e.g. livenet, testnet
  // for tokens, these may differ
  currencyAbbreviation: string; // e.g. btc, eth, usdc
  tokenAddress?: string;
  // Atomic units as a decimal string (keeps precision for large EVM values).
  balanceAtomic: string;
  balanceFormatted: string;
};

export type StoredWallet = {
  walletId: string;
  credentials: WalletCredentials;
  summary: WalletSummary;
  addedAt: number;
};

export type Tx = Record<string, any>;
