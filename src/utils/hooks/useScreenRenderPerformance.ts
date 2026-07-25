import {useCallback, useLayoutEffect, useRef} from 'react';
import {LayoutChangeEvent} from 'react-native';

const elapsed = (startedAt: number) =>
  Math.round((performance.now() - startedAt) * 10) / 10;

export const useScreenRenderPerformance = (screenName: string) => {
  const mountStartedAtRef = useRef(0);
  const layoutLoggedRef = useRef(false);

  if (__DEV__ && mountStartedAtRef.current === 0) {
    mountStartedAtRef.current = performance.now();

    console.log(`[PERF-SCREEN] ${screenName} renderStart`);
  }

  useLayoutEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.log(
      `[PERF-SCREEN] ${screenName} commit deltaMs:${elapsed(
        mountStartedAtRef.current,
      )}`,
    );
  }, [screenName]);

  return useCallback(
    (_event: LayoutChangeEvent) => {
      if (!__DEV__ || layoutLoggedRef.current) {
        return;
      }

      layoutLoggedRef.current = true;

      console.log(
        `[PERF-SCREEN] ${screenName} layout deltaMs:${elapsed(
          mountStartedAtRef.current,
        )}`,
      );

      requestAnimationFrame(() => {
        console.log(
          `[PERF-SCREEN] ${screenName} firstFrame deltaMs:${elapsed(
            mountStartedAtRef.current,
          )}`,
        );

        requestAnimationFrame(() => {
          console.log(
            `[PERF-SCREEN] ${screenName} secondFrame deltaMs:${elapsed(
              mountStartedAtRef.current,
            )}`,
          );
        });
      });
    },
    [screenName],
  );
};
