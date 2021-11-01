import { LogEntry } from './log.models';
import { LogActionType, LogActionTypes } from './log.types';

export const logReduxPersistBlackList = [
  'logs'
];

export interface LogState {
  logs: LogEntry[]
}

const initialState: LogState = {
  logs: [] as LogEntry[]
};

export const logReducer = (
  state: LogState = initialState,
  action: LogActionType
): LogState => {
  switch(action.type) {
    case LogActionTypes.ADD_LOG:
      const newLog = {
        timestamp: action.payload.timestamp,
        level: action.payload.level,
        message: sanitizeLogMessage(action.payload.message)
      };

      return {
        ...state,
        logs: [
          ...state.logs,
          newLog
        ]
      };

    case LogActionTypes.CLEAR_LOGS:
      return {
        ...state,
        logs: []
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
