import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {logManager, LogData} from '../managers/LogManager';
import {LogLevel} from '../store/log/log.models';

const LogContext = createContext<LogData | null>(null);

export const LogProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [logData, setLogData] = useState<LogData>(logManager.getLogData());

  useEffect(() => {
    const unsubscribe = logManager.subscribe(data => {
      setLogData(data);
    });
    return unsubscribe;
  }, []);

  return <LogContext.Provider value={logData}>{children}</LogContext.Provider>;
};

export const useLogContext = (): LogData => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within LogProvider');
  }
  return context;
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
