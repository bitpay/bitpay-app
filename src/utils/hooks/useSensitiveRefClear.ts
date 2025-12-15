import React, {useCallback} from 'react';
import {TextInput} from 'react-native';

function clearInputRef(ref: React.RefObject<TextInput | null>) {
  const node: any = ref.current;
  if (!node) return;

  if (typeof node.clear === 'function') {
    node.clear();
    node.blur?.();
    return;
  }

  node.setNativeProps?.({text: ''});
  node.blur?.();
}

export function useSensitiveRefClear(
  refs: Array<React.RefObject<TextInput | null>>,
) {
  const clearSensitive = useCallback(() => {
    refs.forEach(ref => clearInputRef(ref));
  }, [refs]);
  return {clearSensitive};
}
