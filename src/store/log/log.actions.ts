import {LogActionType, LogActionTypes} from './log.types';
import {LogEntry, LogLevel} from './log.models';

export const clear = (): LogActionType => {
  return {
    type: LogActionTypes.CLEAR_LOGS,
  };
};

export const debug = (
  ...messages: (string | null | undefined)[]
): LogActionType => _log(LogLevel.Debug, ...messages);

export const info = (
  ...messages: (string | null | undefined)[]
): LogActionType => _log(LogLevel.Info, ...messages);

export const warn = (
  ...messages: (string | null | undefined)[]
): LogActionType => _log(LogLevel.Warn, ...messages);

export const error = (
  ...messages: (string | null | undefined)[]
): LogActionType => _log(LogLevel.Error, ...messages);

function _log(
  level: LogLevel,
  ...messages: (string | null | undefined)[]
): LogActionType {
  return {
    type: LogActionTypes.ADD_LOG,
    payload: {
      level,
      message: messages.join(' '),
      timestamp: new Date().toISOString(),
    } as LogEntry,
  };
}
