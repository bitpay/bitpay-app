import {useIsFocused} from '@react-navigation/native';
import React, {useLayoutEffect, useRef} from 'react';
import {Provider as ReduxProvider, useStore} from 'react-redux';
import {RootState} from '../../store';
import {
  createFocusGatedStore,
  FocusGatedStoreController,
} from '../../utils/focusGatedStore';

type FocusGatedReduxScreenProps = {
  children: React.ReactNode;
};

const FocusGatedReduxScreen: React.FC<FocusGatedReduxScreenProps> = ({
  children,
}) => {
  const isFocused = useIsFocused();
  const sourceStore = useStore<RootState>();
  const hasBeenFocusedRef = useRef(isFocused);
  const focusGatedStoreRef =
    useRef<FocusGatedStoreController<RootState> | null>(null);
  const shouldRenderChildren = isFocused || hasBeenFocusedRef.current;

  if (!focusGatedStoreRef.current) {
    focusGatedStoreRef.current = createFocusGatedStore(sourceStore, isFocused);
  }
  const focusGatedStore = focusGatedStoreRef.current;

  useLayoutEffect(() => {
    if (isFocused) {
      hasBeenFocusedRef.current = true;
    }
    focusGatedStore.setFocused(isFocused);
  }, [focusGatedStore, isFocused]);

  if (!shouldRenderChildren) {
    return null;
  }

  return (
    <ReduxProvider store={focusGatedStore.store}>{children}</ReduxProvider>
  );
};

export default FocusGatedReduxScreen;
