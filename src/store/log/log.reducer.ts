import moment from 'moment';
import {LogEntry} from './log.models';
import {LogActionType, LogActionTypes} from './log.types';
import {storage} from '../index';

export const logReduxPersistBlackList = ['logs'];

export interface LogState {
  logs: LogEntry[];
}

const initialState: LogState = {
  logs: [] as LogEntry[],
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

      // Store persisted logs in a different entry in storage
      // to avoid losing them if anything happens to persist:root
      try {
        const persistLogs = storage.getString('persist:logs') || '[]';
        storage.set(
          'persist:logs',
          JSON.stringify([...JSON.parse(persistLogs), newPersistedLog]),
        );
      } catch (error) {
        console.error('Error adding persisted log:', error);
      }

      return {
        ...state,
        logs: [...state.logs, newPersistedLog],
      };

    case LogActionTypes.CLEAR_LOGS:
      const weekAgo = moment().subtract(7, 'day').toDate();

      // Store persisted logs in a different entry in storage
      // to avoid losing them if anything happens to persist:root
      try {
        const persistLogs = storage.getString('persist:logs');
        if (persistLogs) {
          storage.set(
            'persist:logs',
            JSON.stringify(
              (JSON.parse(persistLogs) || []).filter(
                (logEvent: LogEntry) => new Date(logEvent.timestamp) > weekAgo,
              ),
            ),
          );
        }
      } catch (error) {
        console.error('Error clearing persisted logs:', error);
      }

      return {
        ...state,
        logs: [],
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
