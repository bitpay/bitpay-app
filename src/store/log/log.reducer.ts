import moment from 'moment';
import {LogEntry} from './log.models';
import {LogActionType, LogActionTypes} from './log.types';

export const logReduxPersistBlackList = ['logs'];

export interface LogState {
  logs: LogEntry[];
  persistedLogs: LogEntry[];
}

const initialState: LogState = {
  logs: [] as LogEntry[],
  persistedLogs: [] as LogEntry[],
};

export const logReducer = (
  state: LogState = initialState,
  action: LogActionType,
): LogState => {
  switch (action.type) {
    case LogActionTypes.ADD_LOG:
      const newLog = {
        timestamp: action.payload.timestamp,
        level: action.payload.level,
        message: sanitizeLogMessage(action.payload.message),
      };

      return {
        ...state,
        logs: [...state.logs, newLog],
      };

    case LogActionTypes.ADD_PERSISTED_LOG:
      const newPersistedLog = {
        timestamp: action.payload.timestamp,
        level: action.payload.level,
        message: sanitizeLogMessage(action.payload.message),
      };

      return {
        ...state,
        logs: [...state.logs, newPersistedLog],
        persistedLogs: [...state.persistedLogs, newPersistedLog],
      };

    case LogActionTypes.CLEAR_LOGS:
      const weekAgo = moment().subtract(7, 'day').toDate();
      return {
        ...state,
        logs: [],
        persistedLogs: (state.persistedLogs || []).filter(
          logEvent => new Date(logEvent.timestamp) > weekAgo,
        ),
      };

    default:
      return state;
  }
};

function sanitizeLogMessage(message: string) {
  message = message.replace('/xpriv.*/', '[...]');
  message = message.replace('/walletPrivKey.*/', 'walletPrivKey:[...]');

  return message;
}
