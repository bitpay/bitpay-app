import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {
  AddLog,
  LogActionType,
  LogActionTypes,
  ShowNonErrorLogs,
} from './log.types';
import {LogEntry, LogLevel} from './log.models';
import {Effect} from '../../store';

export const clear = (): LogActionType => {
  return {
    type: LogActionTypes.CLEAR_LOGS,
  };
};

export const debug = (...messages: (string | null | undefined)[]): Effect =>
  _log(LogLevel.Debug, ...messages);

export const info = (...messages: (string | null | undefined)[]): Effect =>
  _log(LogLevel.Info, ...messages);

export const warn = (...messages: (string | null | undefined)[]): Effect =>
  _log(LogLevel.Warn, ...messages);

export const error = (...messages: (string | null | undefined)[]): Effect =>
  _log(LogLevel.Error, ...messages);

export const persistLog = ({payload}: AddLog): AddLog => ({
  type: LogActionTypes.ADD_PERSISTED_LOG,
  payload,
});

const _log =
  (level: LogLevel, ...messages: (string | null | undefined)[]): Effect =>
  (dispatch, getState) => {
    const {showNonErrorLogs} = getState().LOG;

    if (__DEV__ && !(DISABLE_DEVELOPMENT_LOGGING === 'true') && !!messages) {
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

    if (!showNonErrorLogs && level !== LogLevel.Error) {
      return;
    }

    dispatch({
      type: LogActionTypes.ADD_LOG,
      payload: {
        level,
        message: messages.join(' '),
        timestamp: new Date().toISOString(),
      } as LogEntry,
    });
  };

export const setShowNonErrorLogs = (
  showNonErrorLogs: boolean,
): ShowNonErrorLogs => ({
  type: LogActionTypes.SHOW_NON_ERROR_LOGS,
  payload: showNonErrorLogs,
});
