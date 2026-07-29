import {
  flattenTransactionGroups,
  getCachedAccountTransactionHistory,
  getCachedAccountTransactions,
  getCachedWalletTransactions,
  mergeAccountTransactions,
} from './cachedTxHistory';

jest.mock('./currency', () => ({
  IsERCToken: (currencyAbbreviation: string, chain: string) =>
    !!currencyAbbreviation && currencyAbbreviation !== chain,
}));

const makeWallet = (overrides: Record<string, any> = {}): any => ({
  id: 'wallet-1',
  chain: 'eth',
  currencyAbbreviation: 'eth',
  tokenAddress: undefined,
  credentials: {walletId: 'wallet-1'},
  ...overrides,
});

const makeTx = (overrides: Record<string, any> = {}): any => ({
  txid: 'tx-1',
  action: 'sent',
  chain: 'eth',
  coin: 'eth',
  time: 1_000,
  ...overrides,
});

describe('mergeAccountTransactions', () => {
  it('sorts transactions newest first across wallets', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [makeTx({txid: 'old', time: 1_000})],
        [makeTx({txid: 'new', time: 3_000})],
        [makeTx({txid: 'mid', time: 2_000})],
      ],
    });

    expect(merged.map(tx => tx.txid)).toEqual(['new', 'mid', 'old']);
  });

  it('falls back to createdOn when a transaction has no time', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [makeTx({txid: 'no-time', time: undefined, createdOn: 5_000})],
        [makeTx({txid: 'timed', time: 4_000})],
      ],
    });

    expect(merged.map(tx => tx.txid)).toEqual(['no-time', 'timed']);
  });

  it('keeps the token row for a txid shared by the native and token wallets', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [makeTx({txid: 'shared', coin: 'eth', action: 'sent'})],
        [makeTx({txid: 'shared', coin: 'usdc', action: 'sent'})],
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].coin).toBe('usdc');
  });

  it('keeps received rows instead of collapsing them into the token row', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [makeTx({txid: 'shared', coin: 'eth', action: 'received'})],
        [makeTx({txid: 'shared', coin: 'usdc', action: 'received'})],
      ],
    });

    expect(merged).toHaveLength(2);
  });

  it('filters by the selected chain and applies the limit', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [
          makeTx({txid: 'eth-1', chain: 'eth', time: 3_000}),
          makeTx({txid: 'matic-1', chain: 'matic', time: 2_000}),
          makeTx({txid: 'eth-2', chain: 'eth', time: 1_000}),
        ],
      ],
      selectedChainFilterOption: 'eth',
      limit: 1,
    });

    expect(merged.map(tx => tx.txid)).toEqual(['eth-1']);
  });

  it('drops duplicates that belong to a filtered-out chain', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [
        [makeTx({txid: 'shared', chain: 'matic', coin: 'usdc'})],
        [makeTx({txid: 'shared', chain: 'eth', coin: 'eth'})],
      ],
      selectedChainFilterOption: 'eth',
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].chain).toBe('eth');
  });

  it('ignores empty and nullish entries', () => {
    const merged = mergeAccountTransactions({
      transactionLists: [[], [null as any, undefined as any]],
    });

    expect(merged).toEqual([]);
  });
});

describe('getCachedWalletTransactions', () => {
  it('returns an empty list when the wallet has no cached history', () => {
    expect(getCachedWalletTransactions({wallet: makeWallet()})).toEqual([]);
    expect(
      getCachedWalletTransactions({
        wallet: makeWallet({transactionHistory: {transactions: []}}),
      }),
    ).toEqual([]);
    expect(getCachedWalletTransactions({wallet: undefined})).toEqual([]);
  });

  it('applies the limit to the cached rows', () => {
    const wallet = makeWallet({
      transactionHistory: {
        transactions: [
          makeTx({txid: 'tx-1'}),
          makeTx({txid: 'tx-2'}),
          makeTx({txid: 'tx-3'}),
        ],
      },
    });

    expect(
      getCachedWalletTransactions({wallet, limit: 2}).map(tx => tx.txid),
    ).toEqual(['tx-1', 'tx-2']);
  });

  it('formats copies so the cached rows in the store are not mutated', () => {
    const cachedTx = makeTx({txid: 'tx-1'});
    const wallet = makeWallet({transactionHistory: {transactions: [cachedTx]}});

    const hydrated = getCachedWalletTransactions({
      wallet,
      formatTransactions: ({transactions}) =>
        transactions.map(transaction => {
          transaction.uiDescription = 'Receiving ETH';
          return transaction;
        }),
    });

    expect(hydrated[0].uiDescription).toBe('Receiving ETH');
    expect(cachedTx.uiDescription).toBeUndefined();
  });

  it('passes the owning wallet to the formatter', () => {
    const wallet = makeWallet({
      transactionHistory: {transactions: [makeTx()]},
    });
    const formatTransactions = jest.fn(({transactions}) => transactions);

    getCachedWalletTransactions({wallet, formatTransactions});

    expect(formatTransactions).toHaveBeenCalledWith(
      expect.objectContaining({wallet}),
    );
  });
});

describe('getCachedAccountTransactionHistory', () => {
  it('maps only the wallets that have cached rows', () => {
    const withCache = makeWallet({
      id: 'wallet-1',
      transactionHistory: {
        transactions: [makeTx()],
        loadMore: true,
        hasConfirmingTxs: true,
      },
    });
    const withoutCache = makeWallet({id: 'wallet-2'});
    const emptyCache = makeWallet({
      id: 'wallet-3',
      transactionHistory: {transactions: []},
    });

    const history = getCachedAccountTransactionHistory({
      wallets: [withCache, withoutCache, emptyCache],
    });

    expect(Object.keys(history)).toEqual(['wallet-1']);
    expect(history['wallet-1']).toEqual({
      transactions: [expect.objectContaining({txid: 'tx-1'})],
      loadMore: true,
      hasConfirmingTxs: true,
    });
  });

  it('defaults the paging flags when the cached entry omits them', () => {
    const wallet = makeWallet({
      transactionHistory: {transactions: [makeTx()]},
    });

    const history = getCachedAccountTransactionHistory({wallets: [wallet]});

    expect(history['wallet-1'].loadMore).toBe(false);
    expect(history['wallet-1'].hasConfirmingTxs).toBe(false);
  });
});

describe('getCachedAccountTransactions', () => {
  it('merges the cached rows of every wallet in the account', () => {
    const nativeWallet = makeWallet({
      id: 'wallet-1',
      transactionHistory: {
        transactions: [
          makeTx({txid: 'shared', coin: 'eth', time: 2_000}),
          makeTx({txid: 'older', time: 1_000}),
        ],
      },
    });
    const tokenWallet = makeWallet({
      id: 'wallet-2',
      currencyAbbreviation: 'usdc',
      transactionHistory: {
        transactions: [makeTx({txid: 'shared', coin: 'usdc', time: 2_000})],
      },
    });

    const transactions = getCachedAccountTransactions({
      wallets: [nativeWallet, tokenWallet],
    });

    expect(transactions.map(tx => tx.txid)).toEqual(['shared', 'older']);
    expect(transactions[0].coin).toBe('usdc');
  });

  it('limits the rows taken from each wallet before merging', () => {
    const formatTransactions = jest.fn(({transactions}) => transactions);
    const wallet = makeWallet({
      transactionHistory: {
        transactions: [
          makeTx({txid: 'tx-1', time: 3_000}),
          makeTx({txid: 'tx-2', time: 2_000}),
          makeTx({txid: 'tx-3', time: 1_000}),
        ],
      },
    });

    const transactions = getCachedAccountTransactions({
      wallets: [wallet],
      perWalletLimit: 2,
      formatTransactions,
    });

    expect(transactions.map(tx => tx.txid)).toEqual(['tx-1', 'tx-2']);
    expect(formatTransactions.mock.calls[0][0].transactions).toHaveLength(2);
  });

  it('returns an empty list when no wallet has cached rows', () => {
    expect(
      getCachedAccountTransactions({wallets: [makeWallet(), makeWallet()]}),
    ).toEqual([]);
  });
});

describe('flattenTransactionGroups', () => {
  it('flattens sections into the [title, ...rows] shape', () => {
    expect(
      flattenTransactionGroups([
        {title: 'Pending', data: [makeTx({txid: 'tx-1'})]},
        {title: 'March', data: [makeTx({txid: 'tx-2'})]},
      ]),
    ).toEqual([
      'Pending',
      expect.objectContaining({txid: 'tx-1'}),
      'March',
      expect.objectContaining({txid: 'tx-2'}),
    ]);
  });

  it('handles an empty input', () => {
    expect(flattenTransactionGroups()).toEqual([]);
  });
});
