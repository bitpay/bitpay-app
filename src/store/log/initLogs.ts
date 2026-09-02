import type {AddLog} from './log.types';
import {storage} from '../index';

// For storing logs before the store is initialized
const initLogs: AddLog[] = [];
let drained = false;

// CLEAR_LOGS only prunes persist:logs at startup, so a session stuck in a
// failure loop would grow the array all session long — and every append
// re-serializes the whole thing
const MAX_PERSISTED_LOGS = 500;

// Appends to MMKV instead of dispatching: ADD_PERSISTED_LOG mutates LOG state,
// which makes redux-persist write persist:root, which is itself a code path
// that logs here — dispatching would close that loop
const appendPersistedLog = (log: AddLog) => {
  try {
    const persistedLogs = storage.getString('persist:logs') || '[]';
    storage.set(
      'persist:logs',
      JSON.stringify(
        [...JSON.parse(persistedLogs), log.payload].slice(-MAX_PERSISTED_LOGS),
      ),
    );
  } catch {}
};

export const add = (log: AddLog) => {
  if (drained) {
    appendPersistedLog(log);
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
