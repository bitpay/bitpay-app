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
  keyId: 'key-1',
  chain: 'btc',
  chainName: 'Bitcoin',
  currencyName: 'Bitcoin',
  currencyAbbreviation: 'btc',
  network: 'livenet',
  receiveAddress: 'address-1',
  credentials: {
    walletId: 'wallet-1',
    walletName: 'My Wallet',
    account: 0,
    m: 1,
    n: 1,
    isComplete: () => true,
  },
  balance: {
    sat: 100,
    satLocked: 0,
    satConfirmedLocked: 0,
    satSpendable: 100,
    satPending: 0,
    fiat: 25,
  },
  pendingTxps: [],
  hideWallet: false,
  hideWalletByAccount: false,
  isScanning: false,
  ...overrides,
});

const makeKey = (overrides: Record<string, any> = {}): any => ({
  id: 'key-1',
  keyName: 'My Key',
  backupComplete: true,
  hideKeyBalance: false,
  evmAccountsInfo: {
    'address-1': {
      name: 'Account 1',
      hideAccount: false,
    },
  },
  wallets: [],
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
          wallets: [makeWallet({walletName: 'Top-level rename'})],
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

    it('changes for every wallet field rendered by account rows', () => {
      const base = buildAccountListSignature({wallets: [makeWallet()]});

      [
        {receiveAddress: 'address-2'},
        {chain: 'eth'},
        {network: 'testnet'},
        {tokenAddress: '0xtoken'},
        {hideBalance: true},
        {pendingTssSession: true},
        {pendingTxps: [{id: 'proposal-1'}]},
        {
          balance: {
            ...makeWallet().balance,
            satPending: 10,
          },
        },
        {
          credentials: {
            ...makeWallet().credentials,
            account: 1,
          },
        },
      ].forEach(change => {
        expect(
          buildAccountListSignature({wallets: [makeWallet(change)]}),
        ).not.toBe(base);
      });
    });

    it('changes when key or account display metadata changes', () => {
      const base = buildAccountListSignature({keys: [makeKey()]});

      expect(
        buildAccountListSignature({
          keys: [
            makeKey({
              evmAccountsInfo: {
                'address-1': {name: 'Renamed account', hideAccount: false},
              },
            }),
          ],
        }),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({
          keys: [makeKey({keyName: 'Renamed key'})],
        }),
      ).not.toBe(base);
      expect(
        buildAccountListSignature({
          keys: [makeKey({backupComplete: false})],
        }),
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
    it('uses a deterministic revision that survives a cold start', () => {
      const rates = {btc: []};
      const otherRates = {btc: []};

      const revision = getRatesRevision(rates);
      expect(getRatesRevision(rates)).toBe(revision);
      expect(getRatesRevision(otherRates)).toBe(revision);
      expect(getRatesRevision({btc: [{rate: 1}]})).not.toBe(revision);
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
    it('never returns a snapshot for a mismatched signature', () => {
      writeAccountListSnapshot('key-1', 'old-sig', ['stale row']);

      expect(readAccountListSnapshot('key-1')).toEqual(['stale row']);
      expect(readAccountListSnapshot('key-1', 'new-sig')).toBeUndefined();
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

    it('keeps a stale persisted snapshot available for the first paint', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);
      writeAccountListSnapshot('key-1', 'old-sig', ['stale']);
      simulateAppRestart();

      expect(readAccountListSnapshot('key-1', 'new-sig')).toBeUndefined();
      expect(readAccountListSnapshot('key-1')).toEqual(['stale']);
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

    it('keeps valid persisted payloads regardless of their age', () => {
      const storage = makeMemoryStorage();
      storage.set(
        'accountListSnapshot:key-1',
        JSON.stringify({
          version: 1,
          savedAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
          signature: 'sig',
          value: ['row'],
        }),
      );
      setAccountListSnapshotStorage(storage);

      expect(readAccountListSnapshot('key-1', 'sig')).toEqual(['row']);
    });

    it('ignores corrupted persisted payloads', () => {
      const storage = makeMemoryStorage();
      storage.set('accountListSnapshot:key-1', 'not json');
      setAccountListSnapshotStorage(storage);

      expect(readAccountListSnapshot('key-1')).toBeUndefined();
      expect(storage.entries.has('accountListSnapshot:key-1')).toBe(false);
    });

    it('persists the latest signature for repeated writes to the same key', () => {
      const storage = makeMemoryStorage();
      const setSpy = jest.spyOn(storage, 'set');
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', ['one']);
      writeAccountListSnapshot('key-1', 'sig-2', ['two']);

      expect(setSpy).toHaveBeenCalledTimes(2);
      expect(readAccountListSnapshot('key-1')).toEqual(['two']);
      simulateAppRestart();
      expect(readAccountListSnapshot('key-1', 'sig-2')).toEqual(['two']);
    });

    it('coalesces pending writes and persists the latest value', () => {
      const storage = makeMemoryStorage();
      const scheduled: (() => void)[] = [];
      setAccountListSnapshotStorage(storage);
      setAccountListSnapshotWriteScheduler(write => {
        scheduled.push(write);
      });

      writeAccountListSnapshot('key-1', 'sig-1', ['one']);
      writeAccountListSnapshot('key-1', 'sig-2', ['two']);

      expect(scheduled).toHaveLength(1);
      scheduled[0]();
      simulateAppRestart();

      expect(readAccountListSnapshot('key-1', 'sig-2')).toEqual(['two']);
    });

    it('overwrites the persisted entry when the signature changes', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig-1', ['one']);
      // Simulate a new app session between writes.
      setAccountListSnapshotStorage(storage);
      writeAccountListSnapshot('key-1', 'sig-2', ['two']);

      const snapshotKeys = [...storage.entries.keys()].filter(key =>
        key.startsWith('accountListSnapshot:'),
      );
      const persisted = JSON.parse(
        storage.entries.get('accountListSnapshot:key-1') || '{}',
      );

      expect(snapshotKeys).toEqual(['accountListSnapshot:key-1']);
      expect(persisted.signature).toBe('sig-2');
      expect(persisted.value).toEqual(['two']);
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

    it('does not let a pending old write resurrect a cleared snapshot', () => {
      const storage = makeMemoryStorage();
      const scheduled: (() => void)[] = [];
      setAccountListSnapshotStorage(storage);
      setAccountListSnapshotWriteScheduler(write => {
        scheduled.push(write);
      });

      writeAccountListSnapshot('key-old', 'old-sig', ['old']);
      clearAccountListSnapshots();
      writeAccountListSnapshot('key-new', 'new-sig', ['new']);

      scheduled.reverse().forEach(write => write());

      expect(storage.entries.has('accountListSnapshot:key-old')).toBe(false);
      expect(storage.entries.has('accountListSnapshot:key-new')).toBe(true);
    });

    it('never writes key material or transaction detail to disk', () => {
      const storage = makeMemoryStorage();
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-1', 'sig', [
        {
          id: 'account-1',
          accountName: 'My Account',
          fiatBalanceFormat: '$100.00',
          keyMaterial: {
            mnemonic: 'mnemonic-should-not-persist',
            mnemonicEncrypted: 'mnemonic-encrypted-should-not-persist',
            xPrivKey: 'xpriv-should-not-persist',
            xPrivKeyEncrypted: 'xpriv-encrypted-should-not-persist',
            xPrivKeyEDDSA: 'xpriv-eddsa-should-not-persist',
            xPrivKeyEDDSAEncrypted: 'xpriv-eddsa-encrypted-should-not-persist',
          },
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
        'mnemonic-should-not-persist',
        'mnemonic-encrypted-should-not-persist',
        'xpriv-should-not-persist',
        'xpriv-encrypted-should-not-persist',
        'xpriv-eddsa-should-not-persist',
        'xpriv-eddsa-encrypted-should-not-persist',
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

    it('does not evict valid snapshots as more cache keys are added', () => {
      const storage = makeMemoryStorage();
      const now = Date.now();

      for (let index = 0; index < 30; index++) {
        storage.set(
          `accountListSnapshot:key-${index}`,
          JSON.stringify({
            version: 1,
            savedAt: now,
            signature: 'sig',
            value: ['row'],
          }),
        );
      }
      storage.set('unrelated-key', 'keep me');
      setAccountListSnapshotStorage(storage);

      writeAccountListSnapshot('key-new', 'sig', ['row']);

      expect(storage.entries.has('accountListSnapshot:key-0')).toBe(true);
      expect(storage.entries.has('accountListSnapshot:key-29')).toBe(true);
      expect(storage.entries.has('accountListSnapshot:key-new')).toBe(true);
      expect(storage.entries.get('unrelated-key')).toBe('keep me');
    });

    it('works with persistence unavailable', () => {
      setAccountListSnapshotStorage(null);

      expect(() =>
        writeAccountListSnapshot('key-1', 'sig', ['row']),
      ).not.toThrow();
      expect(readAccountListSnapshot('key-1')).toEqual(['row']);
    });
  });

  it('keeps all in-memory snapshots until explicit invalidation', () => {
    for (let index = 0; index < 50; index++) {
      writeAccountListSnapshot(`key-${index}`, 'sig', [index]);
    }

    expect(readAccountListSnapshot('key-0')).toEqual([0]);
    expect(readAccountListSnapshot('key-49')).toEqual([49]);
  });
});
