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

// Serial queue — ensures only one write uses the shared TEMP_FILE at a time
let backupQueue: Promise<void> = Promise.resolve();

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

// iOS moveFile (NSFileManager moveItemAtPath) throws instead of overwriting when
// the destination already exists
async function moveOverwriting(src: string, dest: string): Promise<void> {
  try {
    const destExists = await RNFS.exists(dest);
    if (destExists) {
      await RNFS.unlink(dest);
    }
  } catch {}
  await RNFS.moveFile(src, dest);
}

export async function backupFileExists(): Promise<boolean> {
  if (cachedBackupExists) {
    return true;
  }
  try {
    const exists = await RNFS.exists(FINAL_FILE);
    cachedBackupExists = exists;
    return exists;
  } catch (_) {
    return false;
  }
}

export function backupPersistRoot(rawJson: string): Promise<void> {
  const run = backupQueue.then(() => _backupPersistRoot(rawJson));
  // Keep the queue serial without poisoning it, while still surfacing failures
  backupQueue = run.catch(() => {});
  return run;
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

  // Rotate current to .bak first, so as few awaits as possible sit between the
  // temp write and the move below
  let finalExists = false;
  try {
    finalExists = await RNFS.exists(FINAL_FILE);
  } catch {}
  if (finalExists) {
    try {
      // Keep only one rolling backup — the helper drops the old .bak first
      await moveOverwriting(FINAL_FILE, BACKUP_FILE);
    } catch (err) {
      // Not reported: rotation is best-effort — a failure just leaves .bak on
      // an older copy, and the write below still lands a fresh final file. The
      // cause is the same wiped directory the write path already reports
      initLogs.add(
        LogActions.persistLog(
          LogActions.error(`Backup rotate failed - ${getErrorString(err)}`),
        ),
      );
    }
  }

  // Both platforms can wipe the cache directory at any point — including between
  // ensureDir() and the write, or between the write and the move — so recreate
  // it and retry once before giving up
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await ensureDir();
      await RNFS.writeFile(TEMP_FILE, filtered, 'utf8');
      await moveOverwriting(TEMP_FILE, FINAL_FILE);
      cachedBackupExists = true;
      return;
    } catch (err) {
      try {
        const tmpExists = await RNFS.exists(TEMP_FILE);
        if (tmpExists) {
          await RNFS.unlink(TEMP_FILE);
        }
      } catch {}
      if (attempt > 0) {
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

export async function readBackupPersistRoot(): Promise<string | null> {
  try {
    const finalExists = await RNFS.exists(FINAL_FILE);
    if (finalExists) {
      const data = await RNFS.readFile(FINAL_FILE, 'utf8');
      try {
        JSON.parse(data);
        return data;
      } catch (_) {
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
      } catch (_) {
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
