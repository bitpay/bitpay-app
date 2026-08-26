import {
  canCacheGlobalSelectList,
  getGlobalSelectInitialAccountSelection,
  getGlobalSelectListCacheKey,
  getGlobalSelectSupportedCurrenciesSignature,
  readCachedGlobalSelectList,
} from './globalSelectListCache';
import {
  clearAccountListSnapshots,
  writeAccountListSnapshot,
} from '../../../store/wallet/utils/accountListCache';

jest.mock('../../../store/wallet/utils/currency', () => ({
  IsVMChain: (chain: string) => ['eth', 'matic', 'sol'].includes(chain),
}));

describe('globalSelectListCache', () => {
  beforeEach(() => {
    clearAccountListSnapshots();
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

    it('separates modal and screen variants', () => {
      expect(
        getGlobalSelectListCacheKey({
          context: 'sell',
          variant: 'modal',
        }),
      ).not.toBe(
        getGlobalSelectListCacheKey({
          context: 'sell',
          variant: 'screen',
        }),
      );
    });
  });

  describe('getGlobalSelectSupportedCurrenciesSignature', () => {
    it('distinguishes object-based currency lists', () => {
      const btc = [
        {
          currencyAbbreviation: 'btc',
          chain: 'btc',
          tokenAddress: undefined,
        },
      ];
      const sol = [
        {
          currencyAbbreviation: 'sol',
          chain: 'sol',
          tokenAddress: undefined,
        },
      ];

      expect(getGlobalSelectSupportedCurrenciesSignature(btc)).not.toBe(
        getGlobalSelectSupportedCurrenciesSignature(sol),
      );
    });

    it('is stable when equivalent objects use a different property order', () => {
      expect(
        getGlobalSelectSupportedCurrenciesSignature([
          {symbol: 'BTC', chain: 'btc'},
        ]),
      ).toBe(
        getGlobalSelectSupportedCurrenciesSignature([
          {chain: 'btc', symbol: 'BTC'},
        ]),
      );
    });

    it('preserves list order because it affects rendered ordering', () => {
      expect(
        getGlobalSelectSupportedCurrenciesSignature(['btc', 'eth']),
      ).not.toBe(getGlobalSelectSupportedCurrenciesSignature(['eth', 'btc']));
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
        readCachedGlobalSelectList({
          canCache: false,
          cacheKey,
          signature: 'sig',
        }),
      ).toBeUndefined();
    });

    it('returns undefined when nothing was cached for that key', () => {
      expect(
        readCachedGlobalSelectList({
          canCache: true,
          cacheKey: getGlobalSelectListCacheKey({context: 'send'}),
          signature: 'sig',
        }),
      ).toBeUndefined();
    });

    it('returns the snapshot stored for that context', () => {
      const cacheKey = getGlobalSelectListCacheKey({context: 'receive'});
      writeAccountListSnapshot(cacheKey, 'sig', [{id: 'row-1'}]);

      expect(
        readCachedGlobalSelectList({
          canCache: true,
          cacheKey,
          signature: 'sig',
        }),
      ).toEqual([{id: 'row-1'}]);
    });

    it('does not report a stale snapshot as available', () => {
      const cacheKey = getGlobalSelectListCacheKey({context: 'receive'});
      writeAccountListSnapshot(cacheKey, 'old-sig', [{id: 'row-1'}]);

      expect(
        readCachedGlobalSelectList({
          canCache: true,
          cacheKey,
          signature: 'new-sig',
        }),
      ).toBeUndefined();
    });
  });
});
