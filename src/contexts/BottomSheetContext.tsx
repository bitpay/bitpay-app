import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';

interface BottomSheetContextType {
  activeSheetIds: string[];
  requestShow: (id: string) => void;
  releaseShow: (id: string) => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(
  undefined,
);

export const BottomSheetProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [activeSheetIds, setActiveSheetIds] = useState<string[]>([]);

  const requestShow = useCallback((id: string) => {
    setActiveSheetIds(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  }, []);

  const releaseShow = useCallback((id: string) => {
    setActiveSheetIds(prev => prev.filter(sheetId => sheetId !== id));
  }, []);

  return (
    <BottomSheetContext.Provider
      value={{activeSheetIds, requestShow, releaseShow}}>
      {children}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => {
  const context = useContext(BottomSheetContext);

  if (!context) {
    return {
      activeSheetIds: [],
      requestShow: () => {},
      releaseShow: () => {},
    };
  }

  return context;
};
