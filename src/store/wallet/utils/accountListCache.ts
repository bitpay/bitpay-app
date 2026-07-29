import {subscribeAssetPnlSummaryCacheClear} from '../../../portfolio/ui/assetPnlSummaryCache';
import type {Wallet} from '../wallet.models';
import {restoreAccountListIcons} from './accountListIcons';

type AccountListSnapshot = {
  signature: string;
  value: unknown;
};

type PersistedAccountListSnapshot = {
  version: number;
  savedAt: number;
  signature: string;
  value: unknown;
};

export type AccountListSnapshotStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  getAllKeys: () => string[];
};

const MAX_SNAPSHOTS = 20;
const SNAPSHOT_SCHEMA_VERSION = 1;
const SNAPSHOT_STORAGE_PREFIX = 'accountListSnapshot:';
const MAX_PERSISTED_SNAPSHOT_BYTES = 256 * 1024;
const PERSISTED_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PERSIST_THROTTLE_MS = 5_000;
const MAX_PERSISTED_SNAPSHOTS = 24;

export const NON_PERSISTABLE_SNAPSHOT_FIELDS = [
  'mnemonic',
  'mnemonicencrypted',
  'xprivkey',
  'xprivkeyencrypted',
  'xprivkeyeddsa',
  'xprivkeyeddsaencrypted',
  'priv',
  'privkey',
  'privkeyencrypted',
  'requestprivkey',
  'walletprivkey',
  'personalencryptingkey',
  'sharedencryptingkey',
  'copayerprivkey',
  'entropy',
  'seed',
  'secret',
  'password',
  'apitoken',
  'doshtoken',
  'credentials',
  'properties',
  'methods',
  'pendingtxps',
  'transactionhistory',
];

const nonPersistableFields = new Set(NON_PERSISTABLE_SNAPSHOT_FIELDS);

const snapshots = new Map<string, AccountListSnapshot>();
const lastPersistedAt = new Map<string, number>();

let storage: AccountListSnapshotStorage | null | undefined;

const getStorage = (): AccountListSnapshotStorage | null => {
  if (storage !== undefined) {
    return storage;
  }

  try {
    const {MMKV} = require('react-native-mmkv');
    storage = new MMKV({
      id: 'account-list-snapshots',
    }) as AccountListSnapshotStorage;
  } catch {
    storage = null;
  }

  return storage ?? null;
};

export const setAccountListSnapshotStorage = (
  nextStorage: AccountListSnapshotStorage | null,
): void => {
  storage = nextStorage;
  lastPersistedAt.clear();
};

const snapshotReplacer = (key: string, value: unknown): unknown => {
  if (key && nonPersistableFields.has(key.toLowerCase())) {
    return undefined;
  }

  if (typeof value === 'function') {
    return undefined;
  }

  return value;
};

const getStorageKey = (cacheKey: string): string =>
  `${SNAPSHOT_STORAGE_PREFIX}${cacheKey}`;

const readPersistedSnapshot = (
  cacheKey: string,
): AccountListSnapshot | undefined => {
  const activeStorage = getStorage();
  if (!activeStorage) {
    return undefined;
  }

  const storageKey = getStorageKey(cacheKey);

  try {
    const raw = activeStorage.getString(storageKey);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as PersistedAccountListSnapshot;

    if (!isSnapshotUsable(parsed) || !Array.isArray(parsed.value)) {
      activeStorage.delete(storageKey);
      return undefined;
    }

    return {
      signature: parsed.signature,
      value: restoreAccountListIcons(parsed.value),
    };
  } catch {
    try {
      activeStorage.delete(storageKey);
    } catch {}
    return undefined;
  }
};

const defaultWriteScheduler = (write: () => void): void => {
  const idleCallback = (global as any).requestIdleCallback;

  if (typeof idleCallback === 'function') {
    idleCallback(write, {timeout: 2000});
    return;
  }

  setTimeout(write, 0);
};

let scheduleWrite: (write: () => void) => void = defaultWriteScheduler;

export const setAccountListSnapshotWriteScheduler = (
  scheduler: ((write: () => void) => void) | null,
): void => {
  scheduleWrite = scheduler ?? defaultWriteScheduler;
};

const isSnapshotUsable = (
  parsed: PersistedAccountListSnapshot | undefined,
): boolean =>
  parsed?.version === SNAPSHOT_SCHEMA_VERSION &&
  Date.now() - (parsed.savedAt || 0) < PERSISTED_SNAPSHOT_TTL_MS;

// Snapshots whose screen is never opened again (deleted keys or accounts) would
// sit on disk forever, since the TTL is only checked when that key is read.
const prunePersistedSnapshots = (
  activeStorage: AccountListSnapshotStorage,
): void => {
  const storageKeys = activeStorage
    .getAllKeys()
    .filter(key => key.startsWith(SNAPSHOT_STORAGE_PREFIX));

  if (storageKeys.length <= MAX_PERSISTED_SNAPSHOTS) {
    return;
  }

  const survivors: {storageKey: string; savedAt: number}[] = [];

  for (const storageKey of storageKeys) {
    let parsed: PersistedAccountListSnapshot | undefined;

    try {
      const raw = activeStorage.getString(storageKey);
      parsed = raw
        ? (JSON.parse(raw) as PersistedAccountListSnapshot)
        : undefined;
    } catch {}

    if (!isSnapshotUsable(parsed)) {
      activeStorage.delete(storageKey);
      continue;
    }

    survivors.push({storageKey, savedAt: parsed!.savedAt || 0});
  }

  if (survivors.length <= MAX_PERSISTED_SNAPSHOTS) {
    return;
  }

  survivors
    .sort((a, b) => a.savedAt - b.savedAt)
    .slice(0, survivors.length - MAX_PERSISTED_SNAPSHOTS)
    .forEach(({storageKey}) => activeStorage.delete(storageKey));
};

const persistSnapshot = (
  cacheKey: string,
  signature: string,
  value: unknown,
): void => {
  const activeStorage = getStorage();
  if (!activeStorage) {
    return;
  }

  const now = Date.now();
  const lastWrite = lastPersistedAt.get(cacheKey);
  if (lastWrite !== undefined && now - lastWrite < PERSIST_THROTTLE_MS) {
    return;
  }

  lastPersistedAt.set(cacheKey, now);

  scheduleWrite(() => {
    try {
      const serialized = JSON.stringify(
        {
          version: SNAPSHOT_SCHEMA_VERSION,
          savedAt: now,
          signature,
          value,
        } as PersistedAccountListSnapshot,
        snapshotReplacer,
      );

      if (serialized.length > MAX_PERSISTED_SNAPSHOT_BYTES) {
        activeStorage.delete(getStorageKey(cacheKey));
        return;
      }

      activeStorage.set(getStorageKey(cacheKey), serialized);
      prunePersistedSnapshots(activeStorage);
    } catch {}
  });
};

const ratesRevisions = new WeakMap<object, number>();
let nextRatesRevision = 0;

export const getRatesRevision = (rates: unknown): number => {
  if (!rates || typeof rates !== 'object') {
    return 0;
  }

  const existing = ratesRevisions.get(rates as object);
  if (existing !== undefined) {
    return existing;
  }

  nextRatesRevision += 1;
  ratesRevisions.set(rates as object, nextRatesRevision);
  return nextRatesRevision;
};

/* eslint-disable no-bitwise */
const hashValue = (hash: number, value: unknown): number => {
  const text = value === undefined || value === null ? '' : String(value);
  let nextHash = (hash * 33) ^ text.length;

  for (let index = 0; index < text.length; index++) {
    nextHash = (nextHash * 33) ^ text.charCodeAt(index);
  }

  return nextHash | 0;
};

const hashWallet = (hash: number, wallet: Wallet): number => {
  const balance = (wallet as any)?.balance || {};

  let nextHash = hashValue(hash, wallet?.id);
  nextHash = hashValue(nextHash, (wallet as any)?.credentials?.walletName);
  nextHash = hashValue(nextHash, balance.sat);
  nextHash = hashValue(nextHash, balance.satLocked);
  nextHash = hashValue(nextHash, balance.fiat);
  nextHash = hashValue(nextHash, (wallet as any)?.hideWallet ? 1 : 0);
  nextHash = hashValue(nextHash, (wallet as any)?.hideWalletByAccount ? 1 : 0);
  nextHash = hashValue(nextHash, (wallet as any)?.isScanning ? 1 : 0);

  return nextHash;
};

/* eslint-enable no-bitwise */

export const buildAccountListSignature = ({
  wallets = [],
  quoteCurrency,
  ratesRevision = 0,
  extra = [],
}: {
  wallets?: Wallet[];
  quoteCurrency?: string;
  ratesRevision?: number;
  extra?: (string | number | boolean | undefined)[];
}): string => {
  let hash = hashValue(5381, quoteCurrency);
  hash = hashValue(hash, ratesRevision);

  for (let index = 0; index < extra.length; index++) {
    hash = hashValue(hash, extra[index]);
  }

  for (let index = 0; index < wallets.length; index++) {
    hash = hashWallet(hash, wallets[index]);
  }

  return `${wallets.length}:${hash}`;
};

const storeSnapshotInMemory = <T>(
  cacheKey: string,
  signature: string,
  value: T,
): void => {
  snapshots.delete(cacheKey);
  snapshots.set(cacheKey, {signature, value});

  while (snapshots.size > MAX_SNAPSHOTS) {
    const oldestKey = snapshots.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    snapshots.delete(oldestKey);
  }
};

export const readAccountListSnapshot = <T>(cacheKey: string): T | undefined => {
  const inMemory = snapshots.get(cacheKey);
  if (inMemory) {
    return inMemory.value as T;
  }

  const persisted = readPersistedSnapshot(cacheKey);
  if (!persisted) {
    return undefined;
  }

  storeSnapshotInMemory(cacheKey, persisted.signature, persisted.value);
  return persisted.value as T;
};

export const writeAccountListSnapshot = <T>(
  cacheKey: string,
  signature: string,
  value: T,
): void => {
  storeSnapshotInMemory(cacheKey, signature, value);
  persistSnapshot(cacheKey, signature, value);
};

export const resolveAccountListSnapshot = <T>({
  cacheKey,
  signature,
  build,
}: {
  cacheKey: string;
  signature: string;
  build: () => T;
}): T => {
  const cached = snapshots.get(cacheKey) ?? readPersistedSnapshot(cacheKey);

  if (cached && cached.signature === signature) {
    storeSnapshotInMemory(cacheKey, signature, cached.value);
    return cached.value as T;
  }

  const value = build();
  writeAccountListSnapshot(cacheKey, signature, value);
  return value;
};

export const clearAccountListMemoryCacheForTests = (): void => {
  snapshots.clear();
  lastPersistedAt.clear();
};

export const clearAccountListSnapshots = (): void => {
  snapshots.clear();
  lastPersistedAt.clear();

  scheduleWrite(() => {
    const activeStorage = getStorage();
    if (!activeStorage) {
      return;
    }

    try {
      activeStorage
        .getAllKeys()
        .filter(key => key.startsWith(SNAPSHOT_STORAGE_PREFIX))
        .forEach(key => activeStorage.delete(key));
    } catch {}
  });
};

subscribeAssetPnlSummaryCacheClear(clearAccountListSnapshots);
