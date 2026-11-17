import {useEffect, useState} from 'react';

/**
 * Startup signal for work that should not compete with the first screen.
 *
 * Root marks the first screen shown when it hides the splash. "Settled" is
 * that moment plus the JS thread going idle (bounded), which is when deferred
 * startup work — prefetches, background checks — can run without delaying the
 * first frames the user sees.
 *
 * If the splash is never hidden through Root (app init failed and the error
 * path hid it directly), settling falls back to a timeout so deferred work is
 * delayed, never skipped.
 */
const SETTLE_IDLE_TIMEOUT_MS = 3000;
const FALLBACK_SETTLE_MS = 15000;

let firstScreenShown = false;
let settled = false;
const settleListeners = new Set<() => void>();

const settle = () => {
  if (settled) {
    return;
  }
  settled = true;
  const listeners = [...settleListeners];
  settleListeners.clear();
  listeners.forEach(listener => listener());
};

/** Schedules `cb` for the next idle moment; returns a canceller. */
const afterIdle = (cb: () => void): (() => void) => {
  const idle = (global as any).requestIdleCallback;
  const cancelIdle = (global as any).cancelIdleCallback;
  if (typeof idle === 'function') {
    const handle = idle(cb, {timeout: SETTLE_IDLE_TIMEOUT_MS});
    return () => {
      if (typeof cancelIdle === 'function') {
        cancelIdle(handle);
      }
    };
  }
  const handle = setTimeout(cb, 0);
  return () => clearTimeout(handle);
};

const fallbackTimer = setTimeout(settle, FALLBACK_SETTLE_MS);

/** Called by Root when the splash comes down over the first real screen. */
export const markFirstScreenShown = (): void => {
  if (firstScreenShown) {
    return;
  }
  firstScreenShown = true;
  clearTimeout(fallbackTimer);
  afterIdle(settle);
};

export const isStartupSettled = (): boolean => settled;

/** Runs `cb` once startup has settled (immediately if it already has). */
export const whenStartupSettled = (cb: () => void): (() => void) => {
  if (settled) {
    cb();
    return () => {};
  }
  settleListeners.add(cb);
  return () => settleListeners.delete(cb);
};

/**
 * Component form: false until startup has settled, plus `extraDelayMs` and a
 * further idle moment. Heavy deferred work (a WebView, say) needs the delay:
 * "settled" lands right after the first screen appears, and work started
 * there just moves the jank onto the user's first look at it.
 */
export const useStartupSettled = (extraDelayMs = 0): boolean => {
  const [value, setValue] = useState(settled && !extraDelayMs);
  useEffect(() => {
    if (value) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelIdle: (() => void) | undefined;
    const unsubscribe = whenStartupSettled(() => {
      if (!extraDelayMs) {
        setValue(true);
        return;
      }
      timer = setTimeout(() => {
        cancelIdle = afterIdle(() => setValue(true));
      }, extraDelayMs);
    });
    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
      }
      // Cancel a still-pending idle callback so it can't setValue after unmount.
      cancelIdle?.();
    };
  }, [value, extraDelayMs]);
  return value;
};

export const resetStartupSignalsForTests = (): void => {
  firstScreenShown = false;
  settled = false;
  settleListeners.clear();
};
