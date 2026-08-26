import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import {
  OngoingProcessData,
  ongoingProcessManager,
  OnGoingProcessMessages,
  OngoingProcessState,
} from '../managers/OngoingProcessManager';
import {logManager} from '../managers/LogManager';

interface OngoingProcessContextType {
  showOngoingProcess: (
    key: OnGoingProcessMessages,
    data?: OngoingProcessData,
  ) => void;
  hideOngoingProcess: () => void;
}

const OngoingProcessStateContext = createContext<
  OngoingProcessState | undefined
>(undefined);

const OngoingProcessActionsContext = createContext<
  OngoingProcessContextType | undefined
>(undefined);

const DEFAULT_ONGOING_PROCESS_STATE: OngoingProcessState = {
  isVisible: false,
  message: undefined,
};

const DEFAULT_ONGOING_PROCESS_ACTIONS: OngoingProcessContextType = {
  showOngoingProcess: () => {},
  hideOngoingProcess: () => {},
};

const ongoingProcessActions: OngoingProcessContextType = {
  showOngoingProcess: (
    key: OnGoingProcessMessages,
    data?: OngoingProcessData,
  ) => {
    ongoingProcessManager.show(key, data);
  },
  hideOngoingProcess: () => {
    ongoingProcessManager.hide();
  },
};

export const OngoingProcessProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [state, setState] = useState<OngoingProcessState>(
    () => ongoingProcessManager?.getState?.() ?? DEFAULT_ONGOING_PROCESS_STATE,
  );

  useEffect(() => {
    if (!ongoingProcessManager?.subscribe) {
      logManager.warn(
        '[OngoingProcessProvider] ongoingProcessManager.subscribe is not available',
      );
      return;
    }

    try {
      const unsubscribe = ongoingProcessManager.subscribe(newState => {
        setState(currentState =>
          currentState.isVisible === newState.isVisible &&
          currentState.message === newState.message
            ? currentState
            : newState,
        );
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

  return (
    <OngoingProcessActionsContext.Provider value={ongoingProcessActions}>
      <OngoingProcessStateContext.Provider value={state}>
        {children}
      </OngoingProcessStateContext.Provider>
    </OngoingProcessActionsContext.Provider>
  );
};

export const useOngoingProcessState = (): OngoingProcessState => {
  const context = useContext(OngoingProcessStateContext);

  if (!context) {
    logManager.warn(
      '[useOngoingProcessState] Context is not available, returning default state',
    );
    return DEFAULT_ONGOING_PROCESS_STATE;
  }

  return context;
};

export const useOngoingProcessActions = (): OngoingProcessContextType => {
  const context = useContext(OngoingProcessActionsContext);

  if (!context) {
    logManager.warn(
      '[useOngoingProcessActions] Context is not available, returning default actions',
    );
    return DEFAULT_ONGOING_PROCESS_ACTIONS;
  }

  return context;
};

export const useOngoingProcess = useOngoingProcessActions;
