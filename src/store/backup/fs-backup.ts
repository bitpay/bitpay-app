import RNFS from 'react-native-fs';
import {LogActions} from '../../store/log';
import * as initLogs from '../../store/log/initLogs';
import {getErrorString} from '../../utils/helper-methods';
import * as Sentry from '@sentry/react-native';

// Use cache directories (CachesDirectoryPath) so backups are NOT included in iCloud/Android Auto Backup
const BASE_CACHE_DIR = RNFS.CachesDirectoryPath;
const BASE_DIR = BASE_CACHE_DIR + '/bitpay/redux';
const FINAL_FILE = BASE_DIR + '/persist-root.json';
const BACKUP_FILE = BASE_DIR + '/persist-root.json.bak';
const TEMP_FILE = BASE_DIR + '/persist-root.json.tmp';

let cachedBackupExists: boolean = false;
let backupCacheGeneration = 0;

// Serial queue — ensures only one write uses the shared TEMP_FILE at a time
let backupQueue: Promise<void> = Promise.resolve();
let backupsSuspended = false;
let deferredBackup: string | null = null;
let requireEncryptedWalletSecrets = false;

function hasEncryptedWalletSecrets(rawJson: string): boolean {
  try {
    const root = JSON.parse(rawJson);
    const wallet =
      typeof root.WALLET === 'string' ? JSON.parse(root.WALLET) : root.WALLET;
    return wallet?.secretsMigrated === true;
  } catch {
    return false;
  }
}

async function ensureDir(): Promise<void> {
  try {
    const exists = await RNFS.exists(BASE_DIR);
    if (!exists) {
      await RNFS.mkdir(BASE_DIR);
    }
  } catch (err) {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(`Backup ensureDir failed - ${getErrorString(err)}`),
      ),
    );
    Sentry.captureException(err, {level: 'error'});
  }
}

export async function backupFileExists(): Promise<boolean> {
  if (backupsSuspended) {
    return false;
  }
  if (cachedBackupExists) {
    return true;
  }
  try {
    const generation = backupCacheGeneration;
    const exists = await RNFS.exists(FINAL_FILE);
    if (backupsSuspended || generation !== backupCacheGeneration) {
      return false;
    }
    cachedBackupExists = exists;
    return exists;
  } catch {
    return false;
  }
}

export function backupPersistRoot(rawJson: string): Promise<void> {
  if (requireEncryptedWalletSecrets && !hasEncryptedWalletSecrets(rawJson)) {
    return Promise.resolve();
  }

  if (backupsSuspended) {
    deferredBackup = rawJson;
    return Promise.resolve();
  }

  backupQueue = backupQueue
    .then(() => _backupPersistRoot(rawJson))
    .catch(() => {});
  return backupQueue;
}

export function removePersistRootBackups(): Promise<void> {
  backupsSuspended = true;
  requireEncryptedWalletSecrets = true;
  backupCacheGeneration += 1;
  cachedBackupExists = false;
  const removal = backupQueue.then(async () => {
    let firstError: unknown;
    for (const path of [FINAL_FILE, BACKUP_FILE, TEMP_FILE]) {
      try {
        if (await RNFS.exists(path)) {
          await RNFS.unlink(path);
        }
      } catch (err) {
        firstError ??= err;
      }
    }
    cachedBackupExists = false;
    if (firstError) {
      throw firstError;
    }
  });

  backupQueue = removal.catch(err => {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(`Backup cleanup failed - ${getErrorString(err)}`),
      ),
    );
    Sentry.captureException(err, {level: 'error'});
  });

  return removal;
}

export function resumePersistRootBackups(
  discardDeferred = false,
): Promise<void> {
  backupsSuspended = false;
  if (discardDeferred) {
    requireEncryptedWalletSecrets = false;
  }
  const rawJson = deferredBackup;
  deferredBackup = null;
  return rawJson && !discardDeferred
    ? backupPersistRoot(rawJson)
    : Promise.resolve();
}

async function _backupPersistRoot(rawJson: string): Promise<void> {
  try {
    let filtered = rawJson;
    try {
      const parsed = JSON.parse(rawJson);
      delete parsed.MARKET_STATS;
      delete parsed.PORTFOLIO;
      delete parsed.PORTFOLIO_CHARTS;
      delete parsed.RATE;
      delete parsed.SHOP_CATALOG;
      filtered = JSON.stringify(parsed);
    } catch {}

    await ensureDir();

    // Write to temp file first
    await RNFS.writeFile(TEMP_FILE, filtered, 'utf8');

    // Rotate current to .bak if present
    const finalExists = await RNFS.exists(FINAL_FILE);
    if (finalExists) {
      try {
        // Remove old .bak if exists to keep only one rolling backup
        const bakExists = await RNFS.exists(BACKUP_FILE);
        if (bakExists) {
          await RNFS.unlink(BACKUP_FILE);
        }
      } catch {}
      try {
        await RNFS.moveFile(FINAL_FILE, BACKUP_FILE);
      } catch (err) {
        initLogs.add(
          LogActions.persistLog(
            LogActions.error(`Backup rotate failed - ${getErrorString(err)}`),
          ),
        );
        Sentry.captureException(err, {level: 'error'});
      }
    }

    // Atomically move temp to final
    await RNFS.moveFile(TEMP_FILE, FINAL_FILE);
    cachedBackupExists = true;
  } catch (err) {
    // Best-effort logging; avoid throwing to not impact primary persist
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(`Backup write failed - ${getErrorString(err)}`),
      ),
    );
    Sentry.captureException(err, {level: 'error'});
    // Cleanup temp if left behind
    try {
      const tmpExists = await RNFS.exists(TEMP_FILE);
      if (tmpExists) {
        await RNFS.unlink(TEMP_FILE);
      }
    } catch {}
  }
}

export async function readBackupPersistRoot(): Promise<string | null> {
  try {
    const finalExists = await RNFS.exists(FINAL_FILE);
    if (finalExists) {
      const data = await RNFS.readFile(FINAL_FILE, 'utf8');
      try {
        JSON.parse(data);
        return data;
      } catch {
        // Fall through to backup
      }
    }
  } catch (err) {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(`Backup read final failed - ${getErrorString(err)}`),
      ),
    );
    Sentry.captureException(err, {level: 'error'});
  }

  try {
    const bakExists = await RNFS.exists(BACKUP_FILE);
    if (bakExists) {
      const data = await RNFS.readFile(BACKUP_FILE, 'utf8');
      try {
        JSON.parse(data);
        return data;
      } catch {
        return null;
      }
    }
  } catch (err) {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(`Backup read bak failed - ${getErrorString(err)}`),
      ),
    );
    Sentry.captureException(err, {level: 'error'});
  }

  return null;
}
