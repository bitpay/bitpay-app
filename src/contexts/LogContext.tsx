import {useEffect, useState} from 'react';
import {logManager, LogData} from '../managers/LogManager';
import {LogLevel} from '../store/log/log.models';

export const useLogContext = (): LogData => {
  const [logData, setLogData] = useState<LogData>(logManager.getLogData());

  useEffect(() => {
    return logManager.subscribe(setLogData);
  }, []);

  return logData;
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
