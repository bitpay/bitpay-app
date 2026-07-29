import {
  buildAccountListSignature,
  clearAccountListMemoryCacheForTests,
  clearAccountListSnapshots,
  getRatesRevision,
  readAccountListSnapshot,
  resolveAccountListSnapshot,
  setAccountListSnapshotStorage,
  setAccountListSnapshotWriteScheduler,
  writeAccountListSnapshot,
  type AccountListSnapshotStorage,
} from './accountListCache';
import {clearAssetPnlSummaryCache} from '../../../portfolio/ui/assetPnlSummaryCache';

jest.mock('./accountListIcons', () => ({
  restoreAccountListIcons: jest.fn((value: any) => {
    if (Array.isArray(value)) {
      value.forEach((row: any) => {
        row.img = () => 'icon';
      });
    }
    return value;
  }),
}));

const {restoreAccountListIcons} = jest.requireMock('./accountListIcons') as {
  restoreAccountListIcons: jest.Mock;
};

const makeMemoryStorage = () => {
  const entries = new Map<string, string>();

  const storage: AccountListSnapshotStorage & {entries: Map<string, string>} = {
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

  return storage;
};

const simulateAppRestart = () => {
  clearAccountListMemoryCacheForTests();
};

const makeWallet = (overrides: Record<string, any> = {}): any => ({
  id: 'wallet-1',
  credentials: {walletName: 'My Wallet'},
  balance: {sat: 100, satLocked: 0, fiat: 25},
  hideWallet: false,
  hideWalletByAccount: false,
  isScanning: false,
  ...overrides,
});

describe('accountListCache', () => {
  beforeEach(() => {
    setAccountListSnapshotWriteScheduler(write => write());
    setAccountListSnapshotStorage(null);
    clearAccountListSnapshots();
    restoreAccountListIcons.mockClear();
  });

  afterEach(() => {
    setAccountListSnapshotStorage(null);
    setAccountListSnapshotWriteScheduler(null);
  });

  describe('buildAccountListSignature', () => {
    it('is stable for equivalent inputs', () => {
      const args = {
        wallets: [makeWallet()],
        quoteCurrency: 'USD',
        ratesRevision: 3,
      };

      expect(buildAccountListSignature(args)).toBe(
        buildAccountListSignature(args),
      );
    });

    it('changes when a balance changes', () => {
      const before = buildAccountListSignature({wallets: [makeWallet()]});
      const after = buildAccountListSignature({
        wallets: [makeWallet({balance: {sat: 200, satLocked: 0, fiat: 50}})],
      });

      expect(before).not.toBe(after);
    });

    it('changes when a wallet is hidden, renamed, added or starts scanning', () => {
      const base = buildAccountListSignature({wallets: [makeWallet()]});

      expect(
        buildAccountListSignature({wallets: [makeWallet({hideWallet: true})]}),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({
          wallets: [makeWallet({credentials: {walletName: 'Renamed'}})],
        }),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({
          wallets: [makeWallet(), makeWallet({id: 'wallet-2'})],
        }),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({wallets: [makeWallet({isScanning: true})]}),
      ).not.toBe(base);
    });

    it('changes when the wallet order changes', () => {
      const walletA = makeWallet({id: 'wallet-a'});
      const walletB = makeWallet({id: 'wallet-b'});

      expect(buildAccountListSignature({wallets: [walletA, walletB]})).not.toBe(
        buildAccountListSignature({wallets: [walletB, walletA]}),
      );
    });

    it('changes when a wallet is removed', () => {
      const walletA = makeWallet({id: 'wallet-a'});
      const walletB = makeWallet({id: 'wallet-b'});

      expect(buildAccountListSignature({wallets: [walletA, walletB]})).not.toBe(
        buildAccountListSignature({wallets: [walletA]}),
      );
    });

    it('changes when the quote currency or the rates revision changes', () => {
      const base = buildAccountListSignature({
        wallets: [makeWallet()],
        quoteCurrency: 'USD',
        ratesRevision: 1,
      });

      expect(
        buildAccountListSignature({
          wallets: [makeWallet()],
          quoteCurrency: 'EUR',
          ratesRevision: 1,
        }),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({
          wallets: [makeWallet()],
          quoteCurrency: 'USD',
          ratesRevision: 2,
        }),
      ).not.toBe(base);
    });
  });

  describe('getRatesRevision', () => {
    it('keeps one revision per rates object identity', () => {
      const rates = {btc: []};
      const otherRates = {btc: []};

      const revision = getRatesRevision(rates);
      expect(getRatesRevision(rates)).toBe(revision);
      expect(getRatesRevision(otherRates)).not.toBe(revision);
    });

    it('returns 0 for missing rates', () => {
      expect(getRatesRevision(undefined)).toBe(0);
      expect(getRatesRevision(null)).toBe(0);
    });
  });

  describe('resolveAccountListSnapshot', () => {
    it('builds and caches on a miss', () => {
      const build = jest.fn(() => ['row']);

      const value = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });

      expect(value).toEqual(['row']);
      expect(build).toHaveBeenCalledTimes(1);
      expect(readAccountListSnapshot('key-1')).toEqual(['row']);
    });

    it('reuses the cached value while the signature matches', () => {
      const build = jest.fn(() => ['row']);

      const first = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });
      const second = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });

      expect(build).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('rebuilds when the signature changes', () => {
      const build = jest
        .fn()
        .mockReturnValueOnce(['stale'])
        .mockReturnValueOnce(['fresh']);

      resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });
      const rebuilt = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-2',
        build,
      });

      expect(build).toHaveBeenCalledTimes(2);
      expect(rebuilt).toEqual(['fresh']);
      expect(readAccountListSnapshot('key-1')).toEqual(['fresh']);
    });

    it('keeps snapshots isolated per cache key', () => {
      resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig',
        build: () => ['one'],
      });
      resolveAccountListSnapshot({
        cacheKey: 'key-2',
        signature: 'sig',
        build: () => ['two'],
      });

      expect(readAccountListSnapshot('key-1')).toEqual(['one']);
      expect(readAccountListSnapshot('key-2')).toEqual(['two']);
    });
  });

  describe('readAccountListSnapshot', () => {
    it('returns the stale snapshot regardless of the current signature', () => {
      writeAccountListSnapshot('key-1', 'old-sig', ['stale row']);

      expect(readAccountListSnapshot('key-1')).toEqual(['stale row']);
    });

    it('returns undefined for an unknown key', () => {
      expect(readAccountListSnapshot('missing')).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('restores a snapshot written before a cold start', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', ['row']);

      simulateAppRestart();

      expect(readAccountListSnapshot('key-1')).toEqual(['row']);
    });

    it('reuses the persisted snapshot without rebuilding when the signature still matches', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);
      writeAccountListSnapshot('key-1', 'sig-1', ['row']);
      simulateAppRestart();

      const build = jest.fn(() => ['rebuilt']);
      const value = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });

      expect(build).not.toHaveBeenCalled();
      expect(value).toEqual(['row']);
    });

    it('rebuilds when the persisted snapshot is stale', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);
      writeAccountListSnapshot('key-1', 'old-sig', ['stale']);
      simulateAppRestart();

      const build = jest.fn(() => ['fresh']);
      const value = resolveAccountListSnapshot({
        cacheKey: 'key-1',
        signature: 'new-sig',
        build,
      });

      expect(build).toHaveBeenCalledTimes(1);
      expect(value).toEqual(['fresh']);
    });

    it('discards persisted payloads from another schema version', () => {
      const storage = makeMemoryStorage();
      storage.set(
        'accountListSnapshot:key-1',
        JSON.stringify({
          version: 999,
          savedAt: Date.now(),
          signature: 'sig',
          value: ['row'],
        }),
      );
      setAccountListSnapshotStorage(storage);

      expect(readAccountListSnapshot('key-1')).toBeUndefined();
      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(false);
    });

    it('discards persisted payloads past the TTL', () => {
      const storage = makeMemoryStorage();
      storage.set(
        'accountListSnapshot:key-1',
        JSON.stringify({
          version: 1,
          savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
          signature: 'sig',
          value: ['row'],
        }),
      );
      setAccountListSnapshotStorage(storage);

      expect(readAccountListSnapshot('key-1')).toBeUndefined();
    });

    it('ignores corrupted persisted payloads', () => {
      const storage = makeMemoryStorage();
      storage.set('accountListSnapshot:key-1', 'not json');
      setAccountListSnapshotStorage(storage);

      expect(readAccountListSnapshot('key-1')).toBeUndefined();
      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(false);
    });

    it('throttles repeated writes for the same key', () => {
      const storage = makeMemoryStorage();
      const setSpy = jest.spyOn(storage, 'set');
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', ['one']);
      writeAccountListSnapshot('key-1', 'sig-2', ['two']);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(readAccountListSnapshot('key-1')).toEqual(['two']);
    });

    it('skips persisting payloads that are too large', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig', ['x'.repeat(300 * 1024)]);

      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(false);
    });

    it('wipes persisted snapshots when the caches are cleared', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);
      writeAccountListSnapshot('key-1', 'sig', ['row']);
      storage.set('unrelated-key', 'keep me');

      clearAccountListSnapshots();

      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(false);
      expect(storage.entries.get('unrelated-key')).toBe('keep me');
    });

    it('never writes key material or transaction detail to disk', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig', [
        {
          id: 'account-1',
          accountName: 'My Account',
          fiatBalanceFormat: '$100.00',
          wallets: [
            {
              id: 'wallet-1',
              cryptoBalance: '1.00',
              tokenAddress: '0xtoken',
              credentials: {
                walletId: 'wallet-1',
                xPrivKey: 'xprv-should-not-persist',
                requestPrivKey: 'req-should-not-persist',
              },
              properties: {mnemonic: 'twelve words should not persist'},
              methods: {get: () => 'nope'},
              pendingTxps: [{txid: 'txp-1', message: 'private note'}],
              transactionHistory: {transactions: [{txid: 'tx-1'}]},
            },
          ],
        },
      ]);

      const persisted = storage.entries.get('accountListSnapshot:key-1') || '';

      expect(persisted).toContain('$100.00');
      expect(persisted).toContain('0xtoken');
      [
        'xprv-should-not-persist',
        'req-should-not-persist',
        'twelve words should not persist',
        'private note',
        'credentials',
        'properties',
        'methods',
        'pendingTxps',
        'transactionHistory',
      ].forEach(sensitive => {
        expect(persisted).not.toContain(sensitive);
      });
    });

    it('restores only the sanitized fields after a restart', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig', [
        {
          id: 'account-1',
          fiatBalanceFormat: '$100.00',
          credentials: {xPrivKey: 'xprv'},
        },
      ]);
      simulateAppRestart();

      const restored = readAccountListSnapshot<any[]>('key-1');

      expect(restored?.[0].fiatBalanceFormat).toBe('$100.00');
      expect(restored?.[0].credentials).toBeUndefined();
    });

    it('restores icons on every read path coming from disk', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', [{id: 'row-1'}]);
      simulateAppRestart();

      expect(readAccountListSnapshot<any[]>('key-1')?.[0].img()).toBe('icon');

      simulateAppRestart();

      const build = jest.fn(() => [{id: 'rebuilt'}]);
      const resolved = resolveAccountListSnapshot<any[]>({
        cacheKey: 'key-1',
        signature: 'sig-1',
        build,
      });

      expect(build).not.toHaveBeenCalled();
      expect(resolved[0].img()).toBe('icon');
      expect(restoreAccountListIcons).toHaveBeenCalledTimes(2);
    });

    it('does not restore icons for snapshots served from memory', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', [{id: 'row-1'}]);
      readAccountListSnapshot('key-1');

      expect(restoreAccountListIcons).not.toHaveBeenCalled();
    });

    it('defers the disk write off the render path', () => {
      const storage = makeMemoryStorage();
      const scheduled: (() => void)[] = [];
      setAccountListSnapshotStorage(storage);
      setAccountListSnapshotWriteScheduler(write => {
        scheduled.push(write);
      });

      writeAccountListSnapshot('key-1', 'sig', [{id: 'row-1'}]);

      expect(storage.entries.size).toBe(0);
      expect(readAccountListSnapshot('key-1')).toEqual([{id: 'row-1'}]);

      scheduled.forEach(write => write());

      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(true);
    });

    it('does not scan the disk while the snapshot count is small', () => {
      const storage = makeMemoryStorage();
      const getStringSpy = jest.spyOn(storage, 'getString');
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig', ['row']);

      expect(getStringSpy).not.toHaveBeenCalled();
    });

    it('drops expired and outdated snapshots once the disk grows', () => {
      const storage = makeMemoryStorage();
      const now = Date.now();

      for (let index = 0; index < 24; index++) {
        storage.set(
          `accountListSnapshot:fresh-${index}`,
          JSON.stringify({
            version: 1,
            savedAt: now,
            signature: 'sig',
            value: ['row'],
          }),
        );
      }
      storage.set(
        'accountListSnapshot:expired',
        JSON.stringify({
          version: 1,
          savedAt: now - 8 * 24 * 60 * 60 * 1000,
          signature: 'sig',
          value: ['row'],
        }),
      );
      storage.set(
        'accountListSnapshot:old-schema',
        JSON.stringify({
          version: 0,
          savedAt: now,
          signature: 'sig',
          value: ['row'],
        }),
      );
      storage.set('unrelated-key', 'keep me');
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-new', 'sig', ['row']);

      expect(storage.entries.has('accountListSnapshot:expired')).toBe(false);
      expect(storage.entries.has('accountListSnapshot:old-schema')).toBe(false);
      expect(storage.entries.get('unrelated-key')).toBe('keep me');
    });

    it('evicts the oldest snapshots past the disk cap', () => {
      const storage = makeMemoryStorage();
      const now = Date.now();

      for (let index = 0; index < 30; index++) {
        storage.set(
          `accountListSnapshot:key-${index}`,
          JSON.stringify({
            version: 1,
            savedAt: now - (30 - index) * 1000,
            signature: 'sig',
            value: ['row'],
          }),
        );
      }
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-newest', 'sig', ['row']);

      const remaining = [...storage.entries.keys()].filter(key =>
        key.startsWith('accountListSnapshot:'),
      );
      expect(remaining).toHaveLength(24);
      expect(remaining).toContain('accountListSnapshot:key-newest');
      expect(remaining).not.toContain('accountListSnapshot:key-0');
      expect(remaining).not.toContain('accountListSnapshot:key-5');
    });

    it('works with persistence unavailable', () => {
      setAccountListSnapshotStorage(null);

      expect(() =>
        writeAccountListSnapshot('key-1', 'sig', ['row']),
      ).not.toThrow();
      expect(readAccountListSnapshot('key-1')).toEqual(['row']);
    });
  });

  it('drops every snapshot when the portfolio caches are cleared', () => {
    writeAccountListSnapshot('key-1', 'sig', ['row']);

    clearAssetPnlSummaryCache();

    expect(readAccountListSnapshot('key-1')).toBeUndefined();
  });

  it('evicts the least recently used snapshots past the cap', () => {
    for (let index = 0; index < 21; index++) {
      writeAccountListSnapshot(`key-${index}`, 'sig', [index]);
    }

    expect(readAccountListSnapshot('key-0')).toBeUndefined();
    expect(readAccountListSnapshot('key-1')).toEqual([1]);
    expect(readAccountListSnapshot('key-20')).toEqual([20]);
  });

  it('keeps reused snapshots from being evicted first', () => {
    writeAccountListSnapshot('key-oldest', 'sig', ['oldest']);
    for (let index = 0; index < 19; index++) {
      writeAccountListSnapshot(`key-${index}`, 'sig', [index]);
    }

    resolveAccountListSnapshot({
      cacheKey: 'key-oldest',
      signature: 'sig',
      build: () => ['rebuilt'],
    });
    writeAccountListSnapshot('key-new', 'sig', ['new']);

    expect(readAccountListSnapshot('key-oldest')).toEqual(['oldest']);
    expect(readAccountListSnapshot('key-0')).toBeUndefined();
  });
});
