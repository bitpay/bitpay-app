import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import {
  ongoingProcessManager,
  OnGoingProcessMessages,
  OngoingProcessState,
} from '../managers/OngoingProcessManager';
import {logManager} from '../managers/LogManager';

interface OngoingProcessContextType {
  isVisible: boolean;
  message: string | undefined;
  showOngoingProcess: (key: OnGoingProcessMessages) => void;
  hideOngoingProcess: () => void;
}

const OngoingProcessContext = createContext<
  OngoingProcessContextType | undefined
>(undefined);

const DEFAULT_ONGOING_PROCESS_STATE: OngoingProcessContextType = {
  isVisible: false,
  message: undefined,
  showOngoingProcess: () => {},
  hideOngoingProcess: () => {},
};

export const OngoingProcessProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const initialState = ongoingProcessManager?.getState?.() ?? {
    isVisible: false,
    message: undefined,
  };

  const [state, setState] = useState<OngoingProcessState>(initialState);

  useEffect(() => {
    if (!ongoingProcessManager?.subscribe) {
      logManager.warn(
        '[OngoingProcessProvider] ongoingProcessManager.subscribe is not available',
      );
      return;
    }

    try {
      const unsubscribe = ongoingProcessManager.subscribe(newState => {
        setState(newState);
      });
      return unsubscribe;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        '[OngoingProcessProvider] Error subscribing to ongoingProcessManager:',
        errStr,
      );
    }
  }, []);

  const contextValue: OngoingProcessContextType = {
    isVisible: state.isVisible,
    message: state.message,
    showOngoingProcess: (key: OnGoingProcessMessages) => {
      ongoingProcessManager.show(key);
    },
    hideOngoingProcess: () => {
      ongoingProcessManager.hide();
    },
  };

  return (
    <OngoingProcessContext.Provider value={contextValue}>
      {children}
    </OngoingProcessContext.Provider>
  );
};

export const useOngoingProcess = () => {
  const context = useContext(OngoingProcessContext);

  if (!context) {
    logManager.warn(
      '[useOngoingProcess] Context is not available, returning default data',
    );
    return DEFAULT_ONGOING_PROCESS_STATE;
  }

  return context;
};
