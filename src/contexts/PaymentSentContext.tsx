import React, {createContext, useContext, useState, ReactNode} from 'react';

interface PaymentSentContextType {
  isVisible: boolean;
  title: string;
  onCloseModal: () => void;
  showPaymentSent: (config: {title: string; onCloseModal: () => void}) => void;
  hidePaymentSent: () => void;
}

const PaymentSentContext = createContext<PaymentSentContextType | undefined>(
  undefined,
);

export const PaymentSentProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [onCloseModal, setOnCloseModal] = useState<() => void>(() => () => {});

  const showPaymentSent = (config: {
    title: string;
    onCloseModal: () => void;
  }) => {
    setTitle(config.title);
    setOnCloseModal(() => config.onCloseModal);
    setIsVisible(true);
  };

  const hidePaymentSent = () => {
    setIsVisible(false);
  };

  return (
    <PaymentSentContext.Provider
      value={{
        isVisible,
        title,
        onCloseModal,
        showPaymentSent,
        hidePaymentSent,
      }}>
      {children}
    </PaymentSentContext.Provider>
  );
};

export const usePaymentSent = () => {
  const context = useContext(PaymentSentContext);
  if (!context) {
    throw new Error('usePaymentSent must be used within PaymentSentProvider');
  }
  return context;
};
