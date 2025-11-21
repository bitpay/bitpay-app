import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {LogEntry, LogLevel} from '../store/log/log.models';

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

  private _log(
    level: LogLevel,
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

    this.addLog({
      level,
      message: messages.join(' '),
      timestamp: new Date().toISOString(),
    });
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

  error(...messages: (string | null | undefined)[]) {
    this._log(LogLevel.Error, ...messages);
  }
}

export const logManager = LogManager.getInstance();
