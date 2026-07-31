import {useCallback, useLayoutEffect, useRef} from 'react';

/**
 * Returns a stable callback which always invokes the latest implementation.
 *
 * This is useful for long-lived list handlers and preloaded screens: their
 * dependencies may change when a placeholder route becomes an active route,
 * but consumers can keep the same callback identity.
 */
export const useLatestCallback = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
) => {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Args): Result => callbackRef.current(...args),
    [],
  );
};
