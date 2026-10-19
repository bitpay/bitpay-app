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

const afterIdle = (cb: () => void) => {
  const idle = (global as any).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(cb, {timeout: SETTLE_IDLE_TIMEOUT_MS});
  } else {
    setTimeout(cb, 0);
  }
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

/** Component form: false until startup has settled. */
export const useStartupSettled = (): boolean => {
  const [value, setValue] = useState(settled);
  useEffect(() => {
    if (value) {
      return;
    }
    return whenStartupSettled(() => setValue(true));
  }, [value]);
  return value;
};

export const resetStartupSignalsForTests = (): void => {
  firstScreenShown = false;
  settled = false;
  settleListeners.clear();
};
