import {LogEntry, sanitizeLogMessage} from './log.models';
import type {AddLog} from './log.types';
import {logManager} from '../../managers/LogManager';
import {storage} from '../index';

// For storing logs before the store is initialized
const initLogs: AddLog[] = [];
let drained = false;

// CLEAR_LOGS only prunes persist:logs at startup, so a session stuck in a
// failure loop would grow the array all session long — and every append
// re-serializes the whole thing
const MAX_PERSISTED_LOGS = 500;

// Single writer for persist:logs, shared with the ADD_PERSISTED_LOG reducer so
// the cap and the redaction can't diverge between the two paths
export const appendPersistedLog = (entry: LogEntry): LogEntry => {
  const sanitized = {...entry, message: sanitizeLogMessage(entry.message)};

  // Session Log reads logManager, not LOG.logs — without this, persisted logs
  // are missing from both on-screen sections and from the exported current
  // session. Not a second dispatch: ADD_LOG dirties LOG state, which makes
  // redux-persist write persist:root, itself a path that logs here
  logManager.addLog(sanitized);

  try {
    const persistedLogs = storage.getString('persist:logs') || '[]';
    storage.set(
      'persist:logs',
      JSON.stringify(
        [...JSON.parse(persistedLogs), sanitized].slice(-MAX_PERSISTED_LOGS),
      ),
    );
  } catch {}
  return sanitized;
};

export const add = (log: AddLog) => {
  if (drained) {
    appendPersistedLog(log.payload);
    return;
  }
  initLogs.push(log);
};

export const drainAndDispatch = (dispatch: (action: AddLog) => void) => {
  drained = true;
  if (initLogs.length === 0) {
    return;
  }
  initLogs.forEach(action => dispatch(action));
  initLogs.length = 0;
};
