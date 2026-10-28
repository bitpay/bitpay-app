export enum LogLevel {
  Error,
  Warn,
  Info,
  Debug,
  None,
}

export interface LogEntry {
  /**
   * Log entry level.
   */
  level: LogLevel;

  /**
   * Date/time of the log entry in ISO string format.
   */
  timestamp: string;

  /**
   * Log entry message string.
   */
  message: string;
}

export const sanitizeLogMessage = (message: string) =>
  message
    .replace(/xpriv.*/gi, '[...]')
    .replace(/[xt]prv[1-9A-HJ-NP-Za-km-z]+/g, '[...]')
    .replace(/walletPrivKey.*/gi, 'walletPrivKey:[...]');
