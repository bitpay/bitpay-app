import {useCallback, useLayoutEffect, useRef} from 'react';
import {LayoutChangeEvent} from 'react-native';
import {PERF_DEBUG, performanceLog} from '../performanceDebug';

const elapsed = (startedAt: number) =>
  Math.round((performance.now() - startedAt) * 10) / 10;

export const useScreenRenderPerformance = (screenName: string) => {
  const mountStartedAtRef = useRef(0);
  const layoutLoggedRef = useRef(false);

  if (PERF_DEBUG && mountStartedAtRef.current === 0) {
    mountStartedAtRef.current = performance.now();

    performanceLog(`[PERF-SCREEN] ${screenName} renderStart`);
  }

  useLayoutEffect(() => {
    if (!PERF_DEBUG) {
      return;
    }

    performanceLog(
      `[PERF-SCREEN] ${screenName} commit deltaMs:${elapsed(
        mountStartedAtRef.current,
      )}`,
    );
  }, [screenName]);

  return useCallback(
    (_event: LayoutChangeEvent) => {
      if (!PERF_DEBUG || layoutLoggedRef.current) {
        return;
      }

      layoutLoggedRef.current = true;

      performanceLog(
        `[PERF-SCREEN] ${screenName} layout deltaMs:${elapsed(
          mountStartedAtRef.current,
        )}`,
      );

      requestAnimationFrame(() => {
        performanceLog(
          `[PERF-SCREEN] ${screenName} firstFrame deltaMs:${elapsed(
            mountStartedAtRef.current,
          )}`,
        );

        requestAnimationFrame(() => {
          performanceLog(
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
