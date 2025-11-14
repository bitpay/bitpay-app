import {useRef} from 'react';
import {logManager} from '../../managers/LogManager';

interface Logger {
  clear: () => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export const useLogger: () => Logger = () => {
  const loggerRef = useRef({
    clear() {
      logManager.clearLogs();
    },
    debug(message: string) {
      logManager.debug(message);
    },
    info(message: string) {
      logManager.info(message);
    },
    warn(message: string) {
      logManager.warn(message);
    },
    error(message: string) {
      logManager.error(message);
    },
  });
  return loggerRef.current;
};

export default useLogger;
