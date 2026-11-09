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

export const redactExtendedPrivateKeys = (message: string) =>
  message.replace(/[xt]prv[1-9A-HJ-NP-Za-km-z]+/g, '[...]');

export const sanitizeLogMessage = (message: string) =>
  redactExtendedPrivateKeys(message.replace(/xpriv.*/gi, '[...]')).replace(
    /walletPrivKey.*/gi,
    'walletPrivKey:[...]',
  );

export const sanitizeLogEntries = (entries: LogEntry[]): LogEntry[] =>
  entries.map(entry =>
    typeof entry?.message === 'string'
      ? {...entry, message: sanitizeLogMessage(entry.message)}
      : entry,
  );
