import {LogActionType, LogActionTypes} from './log.types';
import {LogEntry, LogLevel} from './log.models';

export const clear = (): LogActionType => {
  return {
    type: LogActionTypes.CLEAR_LOGS,
  };
};

export const debug = (message?: string): LogActionType =>
  _log(message, LogLevel.Debug);

export const info = (message?: string): LogActionType =>
  _log(message, LogLevel.Info);

export const warn = (message?: string): LogActionType =>
  _log(message, LogLevel.Warn);

export const error = (message?: string): LogActionType =>
  _log(message, LogLevel.Error);

function _log(message: string = '', level: LogLevel): LogActionType {
  return {
    type: LogActionTypes.ADD_LOG,
    payload: {
      level,
      message,
      timestamp: new Date().toISOString(),
    } as LogEntry,
  };
}
