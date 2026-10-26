import {Platform, TurboModule, TurboModuleRegistry} from 'react-native';
import {MMKV} from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {getUniqueId} from 'react-native-device-info';
import {Buffer} from 'buffer';
import {
  modernStorage,
  activateVaultStorage,
  requireVaultActive,
} from './vault-storage';
import {
  transferVault,
  TransferIO,
  Inventory,
  parseTransferRecord,
} from './vault-transfer';
import {
  createVaultKey,
  readVaultKey,
  validatedVaultKey,
  removeKeyAndVerify,
  LEGACY_KEY_SERVICE,
} from './encryption-key';
import {safeVaultError, vaultError} from './vault-diagnostics';
import * as initLogs from './log/initLogs';
import {LogActions} from './log';
import {modernBackupDirectory, modernFiles} from './vault-backup-paths';
import {decodeFileText, encodeFileText} from './vault-file-codec';

const legacyBase = RNFS.CachesDirectoryPath + '/bitpay/redux/persist-root.json';
const legacyFiles = {
  main: legacyBase,
  bak: legacyBase + '.bak',
  temp: legacyBase + '.tmp',
};
const ROOT = 'persist:root';
let controls: MMKV | undefined;
const control = () =>
  (controls ??= new MMKV({id: 'bitpay.wallet.transfer.v2'}));
let legacy: MMKV | undefined;
interface MMKVPlatformContext extends TurboModule {
  getBaseDirectory(): string;
  getAppGroupDirectory(): string | undefined;
}
interface MMKVRetirement extends TurboModule {
  claimLegacyRetirement(): boolean;
}

// Uses the very same platform context as MMKV 3.3.1. An app-group failure is
// an error, never permission to delete a guessed documents path.
const legacyDirectory = (): string => {
  const context = TurboModuleRegistry.getEnforcing<MMKVPlatformContext>(
    'MmkvPlatformContext',
  );
  return (
    (Platform.OS === 'ios' && context.getAppGroupDirectory()) ||
    context.getBaseDirectory()
  );
};
const legacyPair = () => {
  const data = legacyDirectory() + '/mmkv.default';
  return {data, crc: data + '.crc'};
};
const readFile = async (path: string) =>
  (await RNFS.exists(path))
    ? decodeFileText(await RNFS.readFile(path, 'base64'))
    : null;
const readString = (storage: MMKV, key: string): string | null => {
  const raw = storage.getString(key);
  if (raw === undefined && storage.contains(key)) throw new Error();
  return raw ?? null;
};
export const requireLogicallyEmpty = async (paths: {
  data: string;
  crc: string;
}) => {
  const data = Buffer.from(
    await RNFS.read(paths.data, 4, 0, 'base64'),
    'base64',
  );
  const meta = Buffer.from(
    await RNFS.read(paths.crc, 36, 0, 'base64'),
    'base64',
  );
  if (data.length !== 4 || meta.length !== 36) throw new Error();
  // Pinned core v2.0.0: current/alternate/last-confirmed load bounds. A live
  // entry needs >=5 bytes (map prefix, key length/key, value length/value).
  // Older metadata uses only the data header; future versions normalize to 3.
  const sizes = [data.readUInt32LE(0)];
  if (meta.readUInt32LE(4) >= 3)
    sizes.push(meta.readUInt32LE(28), meta.readUInt32LE(32));
  if (sizes.some(size => size >= 5)) throw new Error();
};
const inventory = async (): Promise<Inventory> => {
  try {
    const files = {data: false, crc: false};
    let keys: string[] | undefined;
    const readPrimary = async (): Promise<string | null> => {
      keys = [];
      const paths = legacyPair();
      files.data = await RNFS.exists(paths.data);
      files.crc = await RNFS.exists(paths.crc);
      if (!files.data && !files.crc) return null;
      if (!files.data || !files.crc) throw new Error();
      // Decision 9 permits only the library's ordinary writable-open recovery.
      legacy ??= new MMKV({id: 'mmkv.default'});
      const raw = readString(legacy, ROOT);
      try {
        keys = legacy.getAllKeys();
      } catch {
        keys = undefined;
      }
      if (raw === null) {
        if (!keys) throw new Error();
        // File evidence proves no recoverable live entries, not load success.
        if (keys.length === 0) await requireLogicallyEmpty(paths);
      }
      return raw;
    };
    let raw: string | null | undefined;
    try {
      raw = await readPrimary();
    } catch {
      // Exactly one immediate primary re-read, before considering old backups.
      try {
        raw = await readPrimary();
      } catch {
        raw = undefined;
        keys = undefined;
      }
    }
    const sources: Inventory['sources'] = {
      mmkv: raw,
      async: await AsyncStorage.getItem(ROOT).catch(() => undefined),
      main: null,
      bak: null,
    };
    for (const slot of ['main', 'bak'] as const) {
      try {
        sources[slot] = await readFile(legacyFiles[slot]);
      } catch {
        sources[slot] = undefined;
      }
    }
    return {sources, keys, files};
  } catch {
    throw vaultError('SOURCE_CONFLICT', 'inventory', 'SOURCE_READ');
  }
};

const io: TransferIO = {
  readControl: () => {
    const records = control();
    const raw = readString(records, 'transfer');
    if (records.getAllKeys().some(k => k !== 'transfer')) throw new Error();
    return raw;
  },
  writeControl: raw => control().set('transfer', raw),
  modernKeys: () => modernStorage.getAllKeys(),
  modernTempExists: () => RNFS.exists(modernFiles.temp),
  destinationExists: slot => RNFS.exists(modernFiles[slot]),
  readDestination: async slot => {
    if (slot !== 'root') return readFile(modernFiles[slot]);
    return readString(modernStorage, ROOT);
  },
  writeDestination: async (slot, raw) => {
    if (slot === 'root') modernStorage.set(ROOT, raw);
    else {
      await RNFS.mkdir(modernBackupDirectory);
      await RNFS.writeFile(modernFiles[slot], encodeFileText(raw), 'base64');
    }
  },
  removeDestination: async slot => {
    await RNFS.unlink(modernFiles[slot]);
  },
  inventory,
  legacyKeys: async () => {
    const candidates: string[] = [];
    try {
      const entry = await Keychain.getGenericPassword({
        service: LEGACY_KEY_SERVICE,
      });
      if (entry && entry.password) candidates.push(entry.password);
    } catch {
      /* Failed old credential reads do not change that service. */
    }
    try {
      const id = getUniqueId();
      if (id) candidates.push(id);
    } catch {}
    return [...new Set(candidates)];
  },
  modernKey: async create => {
    const entry = await readVaultKey();
    if (entry) return validatedVaultKey(entry);
    if (!create) return validatedVaultKey(false);
    try {
      return await createVaultKey();
    } catch (error) {
      throw safeVaultError(
        error,
        'NEW_KEY_VERIFICATION',
        'key',
        'KEY_STORAGE',
        'key',
      );
    }
  },
  claimColdRetirement: () =>
    TurboModuleRegistry.getEnforcing<MMKVRetirement>(
      'MmkvCxx',
    ).claimLegacyRetirement(),
  sourceExists: async slot => {
    if (slot === 'async')
      return (await AsyncStorage.getAllKeys()).includes(ROOT);
    return RNFS.exists(
      slot === 'data' || slot === 'crc'
        ? legacyPair()[slot]
        : legacyFiles[slot],
    );
  },
  removeSource: async slot => {
    if (slot === 'async') await AsyncStorage.removeItem(ROOT);
    else
      await RNFS.unlink(
        slot === 'data' || slot === 'crc'
          ? legacyPair()[slot]
          : legacyFiles[slot],
      );
  },
  removeLegacyKey: async () => {
    if (await Keychain.getGenericPassword({service: LEGACY_KEY_SERVICE}))
      await removeKeyAndVerify(LEGACY_KEY_SERVICE);
    if (await Keychain.getGenericPassword({service: LEGACY_KEY_SERVICE}))
      throw new Error();
  },
  pending: () =>
    initLogs.add(
      LogActions.persistLog(
        LogActions.warn('Vault migration deferred: CLEANUP_DEFERRED (cleanup)'),
      ),
    ),
};

export const readVaultTransferRecord = () => {
  requireVaultActive();
  const raw = io.readControl();
  return raw === null ? null : parseTransferRecord(raw);
};

export const vaultLegacySourceExists = (
  slot: 'data' | 'crc' | 'async' | 'main' | 'bak',
) => {
  requireVaultActive();
  return io.sourceExists(slot);
};

let initialization: Promise<string> | undefined;
export const prepareModernVault = (): Promise<string> => {
  initialization ??= transferVault(io)
    .then(key => {
      activateVaultStorage();
      return key;
    })
    .catch(error => {
      initialization = undefined;
      throw safeVaultError(error);
    });
  return initialization;
};
