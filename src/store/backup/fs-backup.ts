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
let rotateReported: boolean = false;

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
  const exists = await RNFS.exists(BASE_DIR);
  if (!exists) {
    await RNFS.mkdir(BASE_DIR);
  }
}

// NSFileWriteFileExistsError, as RNFS formats it (E<DOMAIN><code>)
const IOS_DEST_EXISTS = 'ENSCOCOAERRORDOMAIN516';

// iOS moveFile (NSFileManager moveItemAtPath) throws instead of overwriting an
// existing destination; Android renameTo replaces it. Only clear the
// destination for that error — on any other failure it may be the last good copy
async function moveOverwriting(src: string, dest: string): Promise<void> {
  try {
    await RNFS.moveFile(src, dest);
  } catch (err: any) {
    if (err?.code !== IOS_DEST_EXISTS) {
      throw err;
    }
    await RNFS.unlink(dest);
    await RNFS.moveFile(src, dest);
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

  const run = backupQueue.then(() => _backupPersistRoot(rawJson));
  // Keep the queue serial without poisoning it, while still surfacing failures
  backupQueue = run.catch(() => {});
  return run;
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
  // Already reported by _backupPersistRoot; a cache write failure must not fail
  // the caller (wallet secrets migration rolls back on rejection)
  return rawJson && !discardDeferred
    ? backupPersistRoot(rawJson).catch(() => {})
    : Promise.resolve();
}

async function _backupPersistRoot(rawJson: string): Promise<void> {
  let filtered = rawJson;
  try {
    const parsed = JSON.parse(rawJson);
    delete parsed.MARKET_STATS;
    delete parsed.PORTFOLIO;
    delete parsed.PORTFOLIO_CHARTS;
    delete parsed.RATE;
    delete parsed.SHOP_CATALOG;
    filtered = JSON.stringify(parsed);
  } catch {
    // If parse fails, keep raw json — better to have a backup than none
  }

  // Both platforms can wipe the cache directory at any point — including between
  // ensureDir() and the write, or between the write and the move — so recreate
  // it and retry once before giving up
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await ensureDir();
      await RNFS.writeFile(TEMP_FILE, filtered, 'utf8');

      const finalExists = await RNFS.exists(FINAL_FILE);
      if (finalExists) {
        try {
          await moveOverwriting(FINAL_FILE, BACKUP_FILE);
        } catch (err) {
          // Once per session: a permanently frozen .bak must not be silent, but
          // rotation runs on every backup and initLogs is only drained at startup
          if (!rotateReported) {
            rotateReported = true;
            initLogs.add(
              LogActions.persistLog(
                LogActions.error(
                  `Backup rotate failed - ${getErrorString(err)}`,
                ),
              ),
            );
            Sentry.captureException(err, {level: 'error'});
          }
        }
      }

      await moveOverwriting(TEMP_FILE, FINAL_FILE);
      cachedBackupExists = true;
      return;
    } catch (err) {
      try {
        // Without a final file (e.g. a 516 fallback unlinked it), TEMP may hold
        // the only copy; readBackupPersistRoot falls back to it
        const finalExists = await RNFS.exists(FINAL_FILE);
        const tmpExists = await RNFS.exists(TEMP_FILE);
        if (finalExists && tmpExists) {
          await RNFS.unlink(TEMP_FILE);
        }
      } catch {}
      if (attempt > 0) {
        cachedBackupExists = false;
        initLogs.add(
          LogActions.persistLog(
            LogActions.error(`Backup write failed - ${getErrorString(err)}`),
          ),
        );
        Sentry.captureException(err, {level: 'error'});
        throw err;
      }
    }
  }
}

// A valid TEMP only survives when FINAL is missing, and is then newer than .bak
const READ_ORDER: [string, string][] = [
  [FINAL_FILE, 'final'],
  [TEMP_FILE, 'tmp'],
  [BACKUP_FILE, 'bak'],
];

export async function readBackupPersistRoot(): Promise<string | null> {
  for (const [path, label] of READ_ORDER) {
    try {
      if (await RNFS.exists(path)) {
        const data = await RNFS.readFile(path, 'utf8');
        try {
          JSON.parse(data);
          return data;
        } catch {}
      }
    } catch (err) {
      initLogs.add(
        LogActions.persistLog(
          LogActions.error(
            `Backup read ${label} failed - ${getErrorString(err)}`,
          ),
        ),
      );
      Sentry.captureException(err, {level: 'error'});
    }
  }
  return null;
}
