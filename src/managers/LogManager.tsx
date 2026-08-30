import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {LogEntry, LogLevel} from '../store/log/log.models';
import * as Sentry from '@sentry/react-native';
import {isSessionLogsEnabled} from '../utils/sessionLogs';

export type LogData = {
  logs: LogEntry[];
  count: number;
};

class LogManager {
  private static instance: LogManager;
  private listeners: Set<(data: LogData) => void> = new Set();
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {}

  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  addLog(log: LogEntry) {
    if (!isSessionLogsEnabled()) {
      return;
    }

    this.logs.push(log);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  getLogData(): LogData {
    return {
      logs: this.logs,
      count: this.logs.length,
    };
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (data: LogData) => void): () => void {
    this.listeners.add(listener);
    listener(this.getLogData());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const data = this.getLogData();
    this.listeners.forEach(listener => listener(data));
  }

  private _logWithSentryMessage(
    level: LogLevel,
    sentryMessage: string | undefined,
    ...messages: (string | null | undefined)[]
  ): void {
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

    const message = messages.join(' ');
    const breadcrumbMessage = sentryMessage ?? message;

    switch (LogLevel[level]) {
      case 'Debug':
        Sentry.addBreadcrumb({
          category: 'log',
          message: breadcrumbMessage,
          level: 'debug',
        });
        break;
      case 'Info':
        Sentry.addBreadcrumb({
          category: 'log',
          message: breadcrumbMessage,
          level: 'info',
        });
        break;
      case 'Warn':
        Sentry.addBreadcrumb({
          category: 'log',
          message: breadcrumbMessage,
          level: 'warning',
        });
        break;
      case 'Error':
        Sentry.addBreadcrumb({
          category: 'log',
          message: breadcrumbMessage,
          level: 'error',
        });
        break;
    }

    this.addLog({
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private _log(
    level: LogLevel,
    ...messages: (string | null | undefined)[]
  ): void {
    this._logWithSentryMessage(level, undefined, ...messages);
  }

  debug(...messages: (string | null | undefined)[]) {
    this._log(LogLevel.Debug, ...messages);
  }

  info(...messages: (string | null | undefined)[]) {
    this._log(LogLevel.Info, ...messages);
  }

  warn(...messages: (string | null | undefined)[]) {
    this._log(LogLevel.Warn, ...messages);
  }

  warnWithSentryMessage(localMessage: string, sentryMessage: string) {
    this._logWithSentryMessage(LogLevel.Warn, sentryMessage, localMessage);
  }

  error(...messages: (string | null | undefined)[]) {
    this._log(LogLevel.Error, ...messages);
  }

  captureError(err: Error, ...messages: (string | null | undefined)[]) {
    Sentry.captureException(err, {level: 'error'});
    this._log(LogLevel.Error, ...messages);
  }
}

export const logManager = LogManager.getInstance();
