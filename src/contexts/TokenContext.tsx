import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {tokenManager, TokenData} from '../managers/TokenManager';

const TokenContext = createContext<TokenData | null>(null);

interface TokenProviderProps {
  children: ReactNode;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({children}) => {
  const [tokenData, setTokenData] = useState<TokenData>(
    tokenManager.getTokenOptions(),
  );

  useEffect(() => {
    const unsubscribe = tokenManager.subscribe(data => {
      setTokenData(data);
    });

    return unsubscribe;
  }, []);

  return (
    <TokenContext.Provider value={tokenData}>{children}</TokenContext.Provider>
  );
};

export const useTokenContext = (): TokenData => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useTokenContext must be used within TokenProvider');
  }
  return context;
};
