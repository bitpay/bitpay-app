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
  renderWhenUnfocused?: boolean;
};

const FocusGatedReduxScreen: React.FC<FocusGatedReduxScreenProps> = ({
  children,
  renderWhenUnfocused = false,
}) => {
  const isFocused = useIsFocused();
  const sourceStore = useStore<RootState>();
  const hasBeenFocusedRef = useRef(isFocused || renderWhenUnfocused);
  const focusGatedStoreRef =
    useRef<FocusGatedStoreController<RootState> | null>(null);
  const shouldRenderChildren =
    isFocused || renderWhenUnfocused || hasBeenFocusedRef.current;

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
