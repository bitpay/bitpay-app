import {useEffect, useRef, useState} from 'react';
import {logManager, LogData} from '../managers/LogManager';
import {LogLevel} from '../store/log/log.models';

export const useLogContext = (): LogData => {
  const [logData, setLogData] = useState<LogData>(logManager.getLogData());
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = logManager.subscribe(() => {
      if (frameRef.current != null) {
        return;
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setLogData(logManager.getLogData());
      });
    });
    return () => {
      unsubscribe();
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
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
