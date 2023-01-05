import {useRef} from 'react';
import {useDispatch} from 'react-redux';
import {LogActions} from '../../store/log';

interface Logger {
  clear: () => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export const useLogger: () => Logger = () => {
  const dispatch = useDispatch();

  const loggerRef = useRef({
    clear() {
      dispatch(LogActions.clear());
    },
    debug(message: string) {
      dispatch(LogActions.debug(message));
    },
    info(message: string) {
      dispatch(LogActions.info(message));
    },
    warn(message: string) {
      dispatch(LogActions.warn(message));
    },
    error(message: string) {
      dispatch(LogActions.error(message));
    },
  });

  return loggerRef.current;
};

export default useLogger;
