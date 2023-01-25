import {AddLog, LogActionType, LogActionTypes} from './log.types';
import {LogEntry, LogLevel} from './log.models';

export const clear = (): LogActionType => {
  return {
    type: LogActionTypes.CLEAR_LOGS,
  };
};

export const debug = (...messages: (string | null | undefined)[]): AddLog =>
  _log(LogLevel.Debug, ...messages);

export const info = (...messages: (string | null | undefined)[]): AddLog =>
  _log(LogLevel.Info, ...messages);

export const warn = (...messages: (string | null | undefined)[]): AddLog =>
  _log(LogLevel.Warn, ...messages);

export const error = (...messages: (string | null | undefined)[]): AddLog =>
  _log(LogLevel.Error, ...messages);

export const persistLog = ({payload}: AddLog): AddLog => ({
  type: LogActionTypes.ADD_PERSISTED_LOG,
  payload,
});

function _log(
  level: LogLevel,
  ...messages: (string | null | undefined)[]
): AddLog {
  if (__DEV__ && !!messages) {
    switch (LogLevel[level]) {
      case 'Debug':
        console.debug('[Debug]', ...messages);
        break;
      case 'Info':
        console.info('[Info]', ...messages);
        break;
      case 'Warn':
        console.warn('[Warn]', ...messages);
        break;
      case 'Error':
        console.error('[Error]', ...messages);
        break;
      default:
        console.log('[Log]', ...messages);
    }
  }
  return {
    type: LogActionTypes.ADD_LOG,
    payload: {
      level,
      message: messages.join(' '),
      timestamp: new Date().toISOString(),
    } as LogEntry,
  };
}
