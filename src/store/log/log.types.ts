import {LogEntry} from './log.models';

export enum LogActionTypes {
  ADD_LOG = 'LOG/ADD_LOG',
  CLEAR_LOGS = 'LOG/CLEAR_LOGS',
}

interface AddLog {
  type: typeof LogActionTypes.ADD_LOG;
  payload: LogEntry;
}

interface ClearLogs {
  type: typeof LogActionTypes.CLEAR_LOGS;
}

export type LogActionType = AddLog | ClearLogs;
