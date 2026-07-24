import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';

interface PaymentSentState {
  isVisible: boolean;
  title: string;
  onCloseModal: () => void;
}

interface PaymentSentConfig {
  title: string;
  onCloseModal: () => void;
}

interface PaymentSentActions {
  showPaymentSent: (config: PaymentSentConfig) => void;
  hidePaymentSent: () => void;
}

const PaymentSentStateContext = createContext<PaymentSentState | undefined>(
  undefined,
);

const PaymentSentActionsContext = createContext<PaymentSentActions | undefined>(
  undefined,
);

const initialPaymentSentState: PaymentSentState = {
  isVisible: false,
  title: '',
  onCloseModal: () => {},
};

export const PaymentSentProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [state, setState] = useState<PaymentSentState>(initialPaymentSentState);

  const showPaymentSent = useCallback((config: PaymentSentConfig) => {
    setState({
      isVisible: true,
      title: config.title,
      onCloseModal: config.onCloseModal,
    });
  }, []);

  const hidePaymentSent = useCallback(() => {
    setState(currentState =>
      currentState.isVisible
        ? {
            ...currentState,
            isVisible: false,
          }
        : currentState,
    );
  }, []);

  const actions = useMemo(
    () => ({
      showPaymentSent,
      hidePaymentSent,
    }),
    [showPaymentSent, hidePaymentSent],
  );

  return (
    <PaymentSentActionsContext.Provider value={actions}>
      <PaymentSentStateContext.Provider value={state}>
        {children}
      </PaymentSentStateContext.Provider>
    </PaymentSentActionsContext.Provider>
  );
};

export const usePaymentSentState = (): PaymentSentState => {
  const context = useContext(PaymentSentStateContext);
  if (!context) {
    throw new Error(
      'usePaymentSentState must be used within PaymentSentProvider',
    );
  }
  return context;
};

export const usePaymentSentActions = (): PaymentSentActions => {
  const context = useContext(PaymentSentActionsContext);
  if (!context) {
    throw new Error(
      'usePaymentSentActions must be used within PaymentSentProvider',
    );
  }
  return context;
};

export const usePaymentSent = usePaymentSentActions;
