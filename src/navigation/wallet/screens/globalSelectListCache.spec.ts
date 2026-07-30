import {
  canCacheGlobalSelectList,
  getGlobalSelectInitialAccountSelection,
  getGlobalSelectListCacheKey,
  readCachedGlobalSelectList,
} from './globalSelectListCache';
import {
  clearAccountListMemoryCacheForTests,
  clearAccountListSnapshots,
  setAccountListSnapshotStorage,
  setAccountListSnapshotWriteScheduler,
  writeAccountListSnapshot,
  type AccountListSnapshotStorage,
} from '../../../store/wallet/utils/accountListCache';

jest.mock('../../../store/wallet/utils/currency', () => ({
  IsVMChain: (chain: string) => ['eth', 'matic', 'sol'].includes(chain),
}));

jest.mock('../../../store/wallet/utils/accountListIcons', () => ({
  restoreAccountListIcons: jest.fn((value: any) => {
    if (Array.isArray(value)) {
      value.forEach(row => {
        row.img = () => 'icon';
      });
    }
    return value;
  }),
}));

const makeMemoryStorage = (): AccountListSnapshotStorage & {
  entries: Map<string, string>;
} => {
  const entries = new Map<string, string>();

  return {
    entries,
    getString: (key: string) => entries.get(key),
    set: (key: string, value: string) => {
      entries.set(key, value);
    },
    delete: (key: string) => {
      entries.delete(key);
    },
    getAllKeys: () => [...entries.keys()],
  };
};

describe('globalSelectListCache', () => {
  beforeEach(() => {
    setAccountListSnapshotWriteScheduler(write => write());
    setAccountListSnapshotStorage(null);
    clearAccountListSnapshots();
  });

  afterEach(() => {
    setAccountListSnapshotStorage(null);
    setAccountListSnapshotWriteScheduler(null);
  });

  describe('getGlobalSelectListCacheKey', () => {
    it('separates send and receive', () => {
      expect(getGlobalSelectListCacheKey({context: 'send'})).not.toBe(
        getGlobalSelectListCacheKey({context: 'receive'}),
      );
    });

    it('separates accounts within the same context', () => {
      expect(
        getGlobalSelectListCacheKey({
          context: 'send',
          selectedAccountAddress: 'address-1',
        }),
      ).not.toBe(
        getGlobalSelectListCacheKey({
          context: 'send',
          selectedAccountAddress: 'address-2',
        }),
      );
    });

    it('is stable for the same inputs', () => {
      const args = {context: 'receive', selectedAccountAddress: 'address-1'};

      expect(getGlobalSelectListCacheKey(args)).toBe(
        getGlobalSelectListCacheKey(args),
      );
    });

    it('separates custom supported currency variants', () => {
      expect(
        getGlobalSelectListCacheKey({
          context: 'sell',
          variant: 'modal:btc|eth',
        }),
      ).not.toBe(
        getGlobalSelectListCacheKey({
          context: 'sell',
          variant: 'modal:btc|sol',
        }),
      );
    });
  });

  describe('canCacheGlobalSelectList', () => {
    it('caches the plain send and receive screens', () => {
      expect(canCacheGlobalSelectList({})).toBe(true);
    });

    it('skips generic modal variants and custom currency flows', () => {
      expect(canCacheGlobalSelectList({useAsModal: true})).toBe(false);
      expect(
        canCacheGlobalSelectList({customSupportedCurrencies: ['btc']}),
      ).toBe(false);
      expect(
        canCacheGlobalSelectList({customToSelectCurrencies: ['btc']}),
      ).toBe(false);
    });

    it('caches the Sell modal account list', () => {
      expect(
        canCacheGlobalSelectList({
          context: 'sell',
          useAsModal: true,
          customSupportedCurrencies: ['btc'],
        }),
      ).toBe(true);
    });
  });

  describe('getGlobalSelectInitialAccountSelection', () => {
    const makeList = (accounts: any[]) => [{key: 'key-1', accounts}];
    const vmAccount = {
      keyId: 'key-1',
      chains: ['eth'],
      accountName: 'EVM Account',
      accountNumber: 0,
      receiveAddress: 'address-1',
      assetsByChain: [{chain: 'eth', chainAssetsList: []}],
    };

    it('selects the account when there is a single VM account', () => {
      expect(
        getGlobalSelectInitialAccountSelection(makeList([vmAccount])),
      ).toEqual({
        account: {
          keyId: 'key-1',
          chains: ['eth'],
          accountName: 'EVM Account',
          accountNumber: 0,
          receiveAddress: 'address-1',
        },
        assetsByChain: [{chain: 'eth', chainAssetsList: []}],
      });
    });

    it('defaults the assets to an empty list', () => {
      const selection = getGlobalSelectInitialAccountSelection(
        makeList([{...vmAccount, assetsByChain: undefined}]),
      );

      expect(selection?.assetsByChain).toEqual([]);
    });

    it('skips non-VM accounts, multiple accounts and multiple keys', () => {
      expect(
        getGlobalSelectInitialAccountSelection(
          makeList([{...vmAccount, chains: ['btc']}]),
        ),
      ).toBeUndefined();
      expect(
        getGlobalSelectInitialAccountSelection(
          makeList([vmAccount, {...vmAccount, receiveAddress: 'address-2'}]),
        ),
      ).toBeUndefined();
      expect(
        getGlobalSelectInitialAccountSelection([
          ...makeList([vmAccount]),
          ...makeList([vmAccount]),
        ]),
      ).toBeUndefined();
    });

    it('handles lists without accounts and non-list input', () => {
      expect(getGlobalSelectInitialAccountSelection([])).toBeUndefined();
      expect(getGlobalSelectInitialAccountSelection(makeList([]))).toBe(
        undefined,
      );
      expect(
        getGlobalSelectInitialAccountSelection([{id: 'btc'}]),
      ).toBeUndefined();
      expect(getGlobalSelectInitialAccountSelection(undefined)).toBeUndefined();
    });
  });

  describe('readCachedGlobalSelectList', () => {
    it('returns undefined when caching does not apply', () => {
      const cacheKey = getGlobalSelectListCacheKey({context: 'send'});
      writeAccountListSnapshot(cacheKey, 'sig', [{id: 'row-1'}]);

      expect(
        readCachedGlobalSelectList({canCache: false, cacheKey}),
      ).toBeUndefined();
    });

    it('returns undefined when nothing was cached for that key', () => {
      expect(
        readCachedGlobalSelectList({
          canCache: true,
          cacheKey: getGlobalSelectListCacheKey({context: 'send'}),
        }),
      ).toBeUndefined();
    });

    it('returns the snapshot stored for that context', () => {
      const cacheKey = getGlobalSelectListCacheKey({context: 'receive'});
      writeAccountListSnapshot(cacheKey, 'sig', [{id: 'row-1'}]);

      expect(readCachedGlobalSelectList({canCache: true, cacheKey})).toEqual([
        {id: 'row-1'},
      ]);
    });

    it('restores icons on a snapshot coming from disk', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);
      const cacheKey = getGlobalSelectListCacheKey({context: 'send'});
      writeAccountListSnapshot(cacheKey, 'sig', [{id: 'row-1'}]);

      clearAccountListMemoryCacheForTests();

      const restored = readCachedGlobalSelectList<any[]>({
        canCache: true,
        cacheKey,
      });

      expect(restored?.[0].img()).toBe('icon');
    });
  });
});
