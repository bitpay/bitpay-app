import {MMKV} from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import {APP_NAME_UPPERCASE} from '../constants/config';

export const SESSION_LOGS_PROD_ENABLED_STORAGE_KEY = 'sessionLogsProdEnabled';
export const PERSISTED_SESSION_LOGS_STORAGE_KEY = 'persist:logs';
export const SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY = 'sessionLogsCleanupDone';
export const SESSION_LOGS_EASTER_EGG_TAP_COUNT = 5;

const sessionLogsStorage = new MMKV();
const sessionLogArtifactBasenames = [`${APP_NAME_UPPERCASE}-logs`, 'App-logs'];

export const isSessionLogsEnabled = () =>
  __DEV__ ||
  (sessionLogsStorage.getBoolean(SESSION_LOGS_PROD_ENABLED_STORAGE_KEY) ??
    false);

export const getSessionLogsProdEnabled = () =>
  sessionLogsStorage.getBoolean(SESSION_LOGS_PROD_ENABLED_STORAGE_KEY) ?? false;

export const setSessionLogsProdEnabled = (enabled: boolean) => {
  sessionLogsStorage.set(SESSION_LOGS_PROD_ENABLED_STORAGE_KEY, enabled);
};

const getSessionLogArtifactPaths = () => {
  const roots = [RNFS.TemporaryDirectoryPath, RNFS.LibraryDirectoryPath].filter(
    (path): path is string => typeof path === 'string' && path.length > 0,
  );

  return Array.from(
    new Set(
      roots.flatMap(root =>
        sessionLogArtifactBasenames.flatMap(basename => [
          `${root}/${basename}.txt`,
          `${root}/${basename}`,
        ]),
      ),
    ),
  );
};

export const removeSessionLogArtifact = async (path: string) => {
  try {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
    return true;
  } catch {
    return false;
  }
};

export const withTemporarySessionLogFile = async <T>(
  rootPath: string,
  filename: string,
  data: string,
  consumeFile: (filePath: string) => Promise<T>,
) => {
  const filePath = `${rootPath}/${filename}.txt`;

  try {
    await RNFS.writeFile(filePath, data, 'utf8');
    return await consumeFile(filePath);
  } finally {
    await removeSessionLogArtifact(filePath);
  }
};

export const clearStoredSessionLogs = async () => {
  let persistedLogsRemoved = true;

  try {
    sessionLogsStorage.delete(PERSISTED_SESSION_LOGS_STORAGE_KEY);
  } catch {
    persistedLogsRemoved = false;
  }

  const artifactRemovalResults = await Promise.all(
    getSessionLogArtifactPaths().map(path => removeSessionLogArtifact(path)),
  );
  const artifactsRemoved = artifactRemovalResults.every(Boolean);

  if (!persistedLogsRemoved || !artifactsRemoved) {
    return false;
  }

  try {
    sessionLogsStorage.set(SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY, true);
    return true;
  } catch {
    return false;
  }
};

export const hasSessionLogsCleanupRun = () => {
  try {
    return (
      sessionLogsStorage.getBoolean(SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY) ??
      false
    );
  } catch {
    return false;
  }
};

export const cleanupDisabledSessionLogs = async () => {
  if (isSessionLogsEnabled()) {
    try {
      sessionLogsStorage.delete(SESSION_LOGS_CLEANUP_DONE_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  return clearStoredSessionLogs();
};
