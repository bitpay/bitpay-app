import type {Wallet} from '../wallet.models';
import {IsERCToken} from './currency';

export const INITIAL_CACHED_TX_HYDRATION_LIMIT = 10;

export type CachedWalletTransactionHistory = {
  transactions: any[];
  loadMore: boolean;
  hasConfirmingTxs: boolean;
};

export type CachedAccountTransactionHistory = {
  [walletId: string]: CachedWalletTransactionHistory;
};

export type FormatCachedTransactions = (args: {
  transactions: any[];
  wallet: Wallet;
}) => any[];

const isReceivedAction = (action: string | undefined): boolean =>
  action === 'received';

const getTransactionTime = (transaction: any): number => {
  const time = new Date(transaction?.time || transaction?.createdOn).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const mergeAccountTransactions = ({
  transactionLists,
  selectedChainFilterOption,
  limit,
}: {
  transactionLists: any[][];
  selectedChainFilterOption?: string;
  limit?: number;
}): any[] => {
  const deduped: any[] = [];
  const indexByTxid = new Map<string, number>();

  for (const transactions of transactionLists) {
    if (!transactions) {
      continue;
    }

    for (const transaction of transactions) {
      if (!transaction) {
        continue;
      }

      if (selectedChainFilterOption) {
        if (transaction.chain !== selectedChainFilterOption) {
          continue;
        }
      }

      const existingIndex = indexByTxid.get(transaction.txid);

      if (existingIndex === undefined || isReceivedAction(transaction.action)) {
        if (existingIndex === undefined) {
          indexByTxid.set(transaction.txid, deduped.length);
        }
        deduped.push(transaction);
      } else if (IsERCToken(transaction.coin, transaction.chain)) {
        deduped[existingIndex] = transaction;
      }
    }
  }

  const sorted = deduped.sort(
    (a: any, b: any) => getTransactionTime(b) - getTransactionTime(a),
  );

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
};

export const getCachedWalletTransactions = ({
  wallet,
  limit,
  formatTransactions,
}: {
  wallet?: Wallet;
  limit?: number;
  formatTransactions?: FormatCachedTransactions;
}): any[] => {
  const cached = (wallet as any)?.transactionHistory?.transactions;

  if (!wallet || !Array.isArray(cached) || !cached.length) {
    return [];
  }

  const limited = typeof limit === 'number' ? cached.slice(0, limit) : cached;
  const transactions = limited.map((transaction: any) => ({...transaction}));

  return formatTransactions
    ? formatTransactions({transactions, wallet})
    : transactions;
};

export const flattenTransactionGroups = (
  groups: {title: any; data: any[]}[] = [],
): any[] =>
  groups.reduce(
    (allTransactions, section) => [
      ...allTransactions,
      section.title,
      ...section.data,
    ],
    [] as any[],
  );

export const getCachedAccountTransactionHistory = ({
  wallets,
  limit,
}: {
  wallets: Wallet[];
  limit?: number;
}): CachedAccountTransactionHistory => {
  const accountTransactionsHistory: CachedAccountTransactionHistory = {};

  for (const wallet of wallets) {
    const cached = (wallet as any)?.transactionHistory as
      | CachedWalletTransactionHistory
      | undefined;

    if (!wallet?.id || !cached?.transactions?.length) {
      continue;
    }

    accountTransactionsHistory[wallet.id] = {
      transactions:
        typeof limit === 'number'
          ? cached.transactions.slice(0, limit)
          : cached.transactions,
      loadMore: !!cached.loadMore,
      hasConfirmingTxs: !!cached.hasConfirmingTxs,
    };
  }

  return accountTransactionsHistory;
};

export const getCachedAccountTransactions = ({
  wallets,
  selectedChainFilterOption,
  limit,
  perWalletLimit,
  formatTransactions,
}: {
  wallets: Wallet[];
  selectedChainFilterOption?: string;
  limit?: number;
  perWalletLimit?: number;
  formatTransactions?: FormatCachedTransactions;
}): any[] => {
  const transactionLists = wallets.map(wallet =>
    getCachedWalletTransactions({
      wallet,
      limit: perWalletLimit,
      formatTransactions,
    }),
  );

  return mergeAccountTransactions({
    transactionLists,
    selectedChainFilterOption,
    limit,
  });
};
