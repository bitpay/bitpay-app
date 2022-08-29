import {EffectCallback, useEffect, useRef} from 'react';

/**
 * Accepts a useEffect function that only runs on mount.
 * @param effect A function that can return a useEffect cleanup function.
 */
export const useMount = (effect: EffectCallback) => {
  const effectRef = useRef(effect);

  useEffect(() => effectRef.current(), []);
};

export default useMount;
