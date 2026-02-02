import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {AddLog, LogActionType, LogActionTypes} from './log.types';
import {LogEntry, LogLevel} from './log.models';
import * as Sentry from '@sentry/react-native';

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
  const filteredMessages = messages.filter(m => m != null);
  if (
    __DEV__ &&
    !(DISABLE_DEVELOPMENT_LOGGING === 'true') &&
    filteredMessages.length > 0
  ) {
    switch (LogLevel[level]) {
      case 'Debug':
        console.debug('[Debug]', ...filteredMessages);
        break;
      case 'Info':
        console.info('[Info]', ...filteredMessages);
        break;
      case 'Warn':
        console.warn('[Warn]', ...filteredMessages);
        break;
      case 'Error':
        console.error('[Error]', ...filteredMessages);
        break;
      default:
        console.log('[Log]', ...filteredMessages);
    }
  }
  if (filteredMessages.length > 0) {
    const message = filteredMessages.join(' ');
    switch (LogLevel[level]) {
      case 'Debug':
        Sentry.addBreadcrumb({
          category: 'log',
          message: message,
          level: 'debug',
        });
        break;
      case 'Info':
        Sentry.addBreadcrumb({
          category: 'log',
          message: message,
          level: 'info',
        });
        break;
      case 'Warn':
        Sentry.addBreadcrumb({
          category: 'log',
          message: message,
          level: 'warning',
        });
        break;
      case 'Error':
        Sentry.captureException(new Error(message), {
          level: 'error',
        });
        break;
    }
  }

  return {
    type: LogActionTypes.ADD_LOG,
    payload: {
      level,
      message: filteredMessages.join(' '),
      timestamp: new Date().toISOString(),
    } as LogEntry,
  };
}
