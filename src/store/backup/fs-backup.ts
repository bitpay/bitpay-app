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
  if (cachedBackupExists) {
    return true;
  }
  try {
    const cachedBackupExists = await RNFS.exists(FINAL_FILE);
    return cachedBackupExists;
  } catch (_) {
    return false;
  }
}

export async function backupPersistRoot(rawJson: string): Promise<void> {
  try {
    let filtered = rawJson;
    try {
      const parsed = JSON.parse(rawJson);
      delete parsed.RATE;
      delete parsed.SHOP_CATALOG;
      filtered = JSON.stringify(parsed);
    } catch (_) {
      // If parse fails, keep raw json — better to have a backup than none
    }

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
      } catch (_) {}
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
    } catch (_) {}
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
