import {LogEntry} from './log.models';

export enum LogActionTypes {
  ADD_LOG = 'LOG/ADD_LOG',
  ADD_PERSISTED_LOG = 'LOG/ADD_PERSISTED_LOG',
  CLEAR_LOGS = 'LOG/CLEAR_LOGS',
  SHOW_NON_ERROR_LOGS = 'LOG/SHOW_NON_ERROR_LOGS',
}

export interface AddLog {
  type:
    | typeof LogActionTypes.ADD_LOG
    | typeof LogActionTypes.ADD_PERSISTED_LOG
  payload: LogEntry;
}

export interface ClearLogs {
  type: typeof LogActionTypes.CLEAR_LOGS;
}
export interface ShowNonErrorLogs {
  type: typeof LogActionTypes.SHOW_NON_ERROR_LOGS;
  payload: boolean;
}

export type LogActionType = AddLog | ClearLogs | ShowNonErrorLogs;
