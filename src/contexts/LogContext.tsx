import {useEffect, useState} from 'react';
import {logManager, LogData} from '../managers/LogManager';
import {LogLevel} from '../store/log/log.models';

const EMPTY_LOG_DATA: LogData = {
  logs: [],
  count: 0,
};

export const useLogContext = (enabled = true): LogData => {
  const [logData, setLogData] = useState<LogData>(() =>
    enabled ? logManager.getLogData() : EMPTY_LOG_DATA,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return logManager.subscribe(nextLogData => {
      setLogData(currentLogData =>
        currentLogData.logs === nextLogData.logs &&
        currentLogData.count === nextLogData.count
          ? currentLogData
          : nextLogData,
      );
    });
  }, [enabled]);

  return enabled ? logData : EMPTY_LOG_DATA;
};

export const useLogCount = (): number => {
  const {count} = useLogContext();
  return count;
};

export const useErrorLogs = () => {
  const {logs} = useLogContext();
  return logs.filter(log => log.level === LogLevel.Error);
};

export const useWarningLogs = () => {
  const {logs} = useLogContext();
  return logs.filter(log => log.level === LogLevel.Warn);
};

export const useInfoLogs = () => {
  const {logs} = useLogContext();
  return logs.filter(log => log.level === LogLevel.Info);
};

export const useDebugLogs = () => {
  const {logs} = useLogContext();
  return logs.filter(log => log.level === LogLevel.Debug);
};
