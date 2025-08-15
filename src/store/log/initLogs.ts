import type {AddLog} from './log.types';

// For storing logs before the store is initialized
const initLogs: AddLog[] = [];

export const add = (log: AddLog) => {
  initLogs.push(log);
};

export const drainAndDispatch = (dispatch: (action: AddLog) => void) => {
  if (initLogs.length === 0) {
    return;
  }
  initLogs.forEach(action => dispatch(action));
  initLogs.length = 0;
};
