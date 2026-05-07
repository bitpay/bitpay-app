import {InteractionManager} from 'react-native';
import {isAbortError} from './abort';

const DEFAULT_SCHEDULE_AFTER_INTERACTIONS_FALLBACK_MS = 700;

export type ScheduledAfterInteractionsHandle = {
  cancel: () => void;
  done: Promise<void>;
  signal: AbortSignal;
};

export const scheduleAfterInteractionsAndFrames = (args: {
  callback: (signal: AbortSignal) => void | Promise<void>;
  fallbackMs?: number;
  onError?: (error: unknown) => void;
}): ScheduledAfterInteractionsHandle => {
  const controller = new AbortController();
  let didRun = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;
  let firstFrame: number | undefined;
  let secondFrame: number | undefined;
  let resolveDone: (() => void) | undefined;

  const done = new Promise<void>(resolve => {
    resolveDone = resolve;
  });

  const finish = () => {
    if (!resolveDone) {
      return;
    }

    resolveDone();
    resolveDone = undefined;
  };

  const clearScheduledTimers = () => {
    if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = undefined;
    }
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  const clearScheduledFrames = () => {
    if (typeof cancelAnimationFrame !== 'function') {
      return;
    }

    if (typeof firstFrame === 'number') {
      cancelAnimationFrame(firstFrame);
      firstFrame = undefined;
    }
    if (typeof secondFrame === 'number') {
      cancelAnimationFrame(secondFrame);
      secondFrame = undefined;
    }
  };

  const finishIfCancelled = () => {
    if (!controller.signal.aborted) {
      return false;
    }

    finish();
    return true;
  };

  const shouldSkipScheduling = () => {
    if (finishIfCancelled()) {
      return true;
    }

    return didRun;
  };

  const reportError = (error: unknown) => {
    if (controller.signal.aborted || isAbortError(error)) {
      return;
    }

    try {
      args.onError?.(error);
    } catch {
      // Secondary error handlers should not break the callback lifecycle.
    }
  };

  const executeCallback = () => {
    timeout = undefined;

    if (finishIfCancelled()) {
      return;
    }

    Promise.resolve()
      .then(() => args.callback(controller.signal))
      .catch(reportError)
      .finally(finish);
  };

  const runCallback = () => {
    if (shouldSkipScheduling()) {
      return;
    }

    didRun = true;
    clearScheduledTimers();
    timeout = setTimeout(executeCallback, 0);
  };

  const task = InteractionManager.runAfterInteractions(() => {
    if (shouldSkipScheduling()) {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      firstFrame = requestAnimationFrame(() => {
        firstFrame = undefined;

        if (shouldSkipScheduling()) {
          return;
        }

        secondFrame = requestAnimationFrame(() => {
          secondFrame = undefined;
          runCallback();
        });
      });
      return;
    }

    runCallback();
  });

  if (!controller.signal.aborted && !didRun) {
    fallbackTimeout = setTimeout(
      runCallback,
      Math.max(
        0,
        Math.floor(
          args.fallbackMs ?? DEFAULT_SCHEDULE_AFTER_INTERACTIONS_FALLBACK_MS,
        ),
      ),
    );
  }

  return {
    cancel: () => {
      if (controller.signal.aborted) {
        return;
      }

      controller.abort();
      task.cancel();
      clearScheduledTimers();
      clearScheduledFrames();
      finish();
    },
    done,
    signal: controller.signal,
  };
};
