import React, {createContext, useContext, ReactNode} from 'react';
import {BitPayTheme} from '../themes/bitpay';

const ThemeContext = createContext<BitPayTheme | undefined>(undefined);

interface ThemeProviderProps {
  theme: BitPayTheme;
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme,
  children,
}) => <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

export const useTheme = (): BitPayTheme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
