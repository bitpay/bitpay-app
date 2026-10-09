import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {logManager, LogData} from '../managers/LogManager';
import {LogLevel} from '../store/log/log.models';

const LogContext = createContext<LogData | null>(null);

export const LogProvider: React.FC<{children: ReactNode}> = ({children}) => {
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
