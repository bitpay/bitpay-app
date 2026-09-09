import type {Key, Wallet} from '../wallet.models';
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

const SNAPSHOT_SCHEMA_VERSION = 1;
const SNAPSHOT_STORAGE_PREFIX = 'accountListSnapshot:';
const MAX_PERSISTED_SNAPSHOT_BYTES = 256 * 1024;

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
const pendingPersistedSnapshots = new Map<
  string,
  AccountListSnapshot & {savedAt: number; generation: number}
>();
const scheduledSnapshotWrites = new Set<string>();
let snapshotGeneration = 0;

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
  snapshotGeneration += 1;
  pendingPersistedSnapshots.clear();
  scheduledSnapshotWrites.clear();
  storage = nextStorage;
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
  signature?: string,
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

    // Keep the last valid value available for stale-while-revalidate paints.
    // The next successful write will replace it with the current signature.
    if (signature !== undefined && parsed.signature !== signature) {
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
  typeof parsed.signature === 'string';

const persistSnapshot = (
  cacheKey: string,
  signature: string,
  value: unknown,
): void => {
  const activeStorage = getStorage();
  if (!activeStorage) {
    return;
  }

  const generation = snapshotGeneration;
  pendingPersistedSnapshots.set(cacheKey, {
    signature,
    value,
    savedAt: Date.now(),
    generation,
  });

  // Coalesce changes made before the idle callback. In particular, startup
  // balance/rate updates must replace the first snapshot instead of being
  // dropped by a time-based throttle.
  if (scheduledSnapshotWrites.has(cacheKey)) {
    return;
  }

  scheduledSnapshotWrites.add(cacheKey);

  scheduleWrite(() => {
    if (generation !== snapshotGeneration) {
      return;
    }

    scheduledSnapshotWrites.delete(cacheKey);
    const pendingSnapshot = pendingPersistedSnapshots.get(cacheKey);
    if (!pendingSnapshot || pendingSnapshot.generation !== generation) {
      return;
    }
    pendingPersistedSnapshots.delete(cacheKey);

    try {
      const serialized = JSON.stringify(
        {
          version: SNAPSHOT_SCHEMA_VERSION,
          savedAt: pendingSnapshot.savedAt,
          signature: pendingSnapshot.signature,
          value: pendingSnapshot.value,
        } as PersistedAccountListSnapshot,
        snapshotReplacer,
      );

      if (serialized.length > MAX_PERSISTED_SNAPSHOT_BYTES) {
        activeStorage.delete(getStorageKey(cacheKey));
        return;
      }

      activeStorage.set(getStorageKey(cacheKey), serialized);
    } catch {}
  });
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

const hashStructuredValue = (
  hash: number,
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): number => {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return hashValue(hash, value);
  }

  if (typeof value === 'function') {
    return hashValue(hash, '[function]');
  }

  if (typeof value !== 'object') {
    return hashValue(hash, String(value));
  }

  if (depth >= 12) {
    return hashValue(hash, '[max-depth]');
  }

  if (seen.has(value)) {
    return hashValue(hash, '[circular]');
  }
  seen.add(value);

  let nextHash = hashValue(hash, Array.isArray(value) ? '[' : '{');
  if (Array.isArray(value)) {
    nextHash = hashValue(nextHash, value.length);
    for (const item of value) {
      nextHash = hashStructuredValue(nextHash, item, seen, depth + 1);
    }
  } else {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    nextHash = hashValue(nextHash, keys.length);
    for (const key of keys) {
      nextHash = hashValue(nextHash, key);
      nextHash = hashStructuredValue(nextHash, record[key], seen, depth + 1);
    }
  }

  seen.delete(value);
  return hashValue(nextHash, Array.isArray(value) ? ']' : '}');
};

const ratesRevisions = new WeakMap<object, number>();

export const getRatesRevision = (rates: unknown): number => {
  if (!rates || typeof rates !== 'object') {
    return 0;
  }

  const existing = ratesRevisions.get(rates as object);
  if (existing !== undefined) {
    return existing;
  }

  const revision = hashStructuredValue(5381, rates);
  ratesRevisions.set(rates as object, revision);
  return revision;
};

const hashWallet = (hash: number, wallet: Wallet): number => {
  const walletData = wallet as any;
  const credentials = walletData?.credentials || {};
  let isComplete = true;
  try {
    isComplete =
      typeof credentials.isComplete === 'function'
        ? credentials.isComplete()
        : true;
  } catch {
    isComplete = false;
  }

  let nextHash = hashStructuredValue(hash, {
    id: walletData?.id,
    keyId: walletData?.keyId,
    chain: walletData?.chain,
    chainName: walletData?.chainName,
    currencyName: walletData?.currencyName,
    currencyAbbreviation: walletData?.currencyAbbreviation,
    tokenAddress: walletData?.tokenAddress,
    network: walletData?.network,
    walletName: walletData?.walletName,
    receiveAddress: walletData?.receiveAddress,
    isScanning: walletData?.isScanning,
    hideWallet: walletData?.hideWallet,
    hideWalletByAccount: walletData?.hideWalletByAccount,
    hideBalance: walletData?.hideBalance,
    pendingTssSession: walletData?.pendingTssSession,
    tssMetadata: walletData?.tssMetadata,
    balance: walletData?.balance,
    pendingTxps: walletData?.pendingTxps,
    img:
      typeof walletData?.img === 'string' ? walletData.img : '[bundled-icon]',
    badgeImg:
      typeof walletData?.badgeImg === 'string'
        ? walletData.badgeImg
        : '[bundled-icon]',
    credentials: {
      walletId: credentials.walletId,
      walletName: credentials.walletName,
      account: credentials.account,
      m: credentials.m,
      n: credentials.n,
      tokenAddress: credentials.tokenAddress,
      isComplete,
    },
  });

  return nextHash;
};

const hashKeyAccountMetadata = (hash: number, key: Key): number =>
  hashStructuredValue(hash, {
    id: key.id,
    keyName: key.keyName,
    backupComplete: key.backupComplete,
    hideKeyBalance: key.hideKeyBalance,
    evmAccountsInfo: key.evmAccountsInfo,
  });

/* eslint-enable no-bitwise */

export const buildAccountListSignature = ({
  wallets = [],
  keys = [],
  quoteCurrency,
  ratesRevision = 0,
  extra = [],
}: {
  wallets?: Wallet[];
  keys?: Key[];
  quoteCurrency?: string;
  ratesRevision?: number;
  extra?: (string | number | boolean | undefined)[];
}): string => {
  let hash = hashValue(5381, quoteCurrency);
  hash = hashValue(hash, ratesRevision);

  for (let index = 0; index < extra.length; index++) {
    hash = hashValue(hash, extra[index]);
  }

  for (let index = 0; index < keys.length; index++) {
    hash = hashKeyAccountMetadata(hash, keys[index]);
  }

  for (let index = 0; index < wallets.length; index++) {
    hash = hashWallet(hash, wallets[index]);
  }

  return `${keys.length}:${wallets.length}:${hash}`;
};

const storeSnapshotInMemory = <T>(
  cacheKey: string,
  signature: string,
  value: T,
): void => {
  snapshots.delete(cacheKey);
  snapshots.set(cacheKey, {signature, value});
};

export const readAccountListSnapshot = <T>(
  cacheKey: string,
  signature?: string,
): T | undefined => {
  const inMemory = snapshots.get(cacheKey);
  if (
    inMemory &&
    (signature === undefined || inMemory.signature === signature)
  ) {
    return inMemory.value as T;
  }

  const persisted = readPersistedSnapshot(cacheKey, signature);
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
  const cached = readAccountListSnapshot<T>(cacheKey, signature);
  if (cached !== undefined) {
    return cached;
  }

  const value = build();
  writeAccountListSnapshot(cacheKey, signature, value);
  return value;
};

export const clearAccountListMemoryCacheForTests = (): void => {
  snapshotGeneration += 1;
  snapshots.clear();
  pendingPersistedSnapshots.clear();
  scheduledSnapshotWrites.clear();
};

export const clearAccountListSnapshots = (): void => {
  snapshotGeneration += 1;
  snapshots.clear();
  pendingPersistedSnapshots.clear();
  scheduledSnapshotWrites.clear();

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
};
