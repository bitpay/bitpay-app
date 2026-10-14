import {isAbortError} from './abort';

const DEFAULT_SCHEDULE_AFTER_INTERACTIONS_FALLBACK_MS = 700;
const DEFAULT_TRANSITION_FALLBACK_MS = 800;

type NavigationTransitionEvent = {
  data?: {
    closing?: boolean;
  };
};

type TransitionNavigation = {
  addListener?: (
    event: 'transitionStart' | 'transitionEnd',
    listener: (event: NavigationTransitionEvent) => void,
  ) => (() => void) | {remove: () => void} | undefined;
  getParent?: () => TransitionNavigation | undefined;
};

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
  let idleCallbackHandle: number | undefined;
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

  const clearScheduledIdleCallback = () => {
    if (typeof idleCallbackHandle !== 'number') {
      return;
    }

    const cancelIdleCallback = (global as any).cancelIdleCallback;
    if (typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(idleCallbackHandle);
    }
    idleCallbackHandle = undefined;
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
    clearScheduledIdleCallback();
    timeout = setTimeout(executeCallback, 0);
  };

  const requestIdleCallback = (global as any).requestIdleCallback;
  if (typeof requestIdleCallback === 'function') {
    idleCallbackHandle = requestIdleCallback(runCallback, {
      timeout:
        args.fallbackMs ?? DEFAULT_SCHEDULE_AFTER_INTERACTIONS_FALLBACK_MS,
    });
  } else if (typeof requestAnimationFrame === 'function') {
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
  }

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
      clearScheduledTimers();
      clearScheduledIdleCallback();
      clearScheduledFrames();
      finish();
    },
    done,
    signal: controller.signal,
  };
};

const removeNavigationListener = (
  unsubscribe: (() => void) | {remove: () => void} | undefined,
) => {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  } else {
    unsubscribe?.remove();
  }
};

export const scheduleAfterTransitionAndIdle = (args: {
  navigation: TransitionNavigation;
  callback: (signal: AbortSignal) => void | Promise<void>;
  transitionFallbackMs?: number;
  idleTimeoutMs?: number;
  onError?: (error: unknown) => void;
}): ScheduledAfterInteractionsHandle => {
  const controller = new AbortController();
  let idleTask: ScheduledAfterInteractionsHandle | undefined;
  let transitionFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let transitionInProgress = false;
  let didScheduleIdle = false;
  let resolveDone: (() => void) | undefined;
  const unsubscribers: ((() => void) | {remove: () => void} | undefined)[] = [];

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

  const clearTransitionListeners = () => {
    while (unsubscribers.length) {
      removeNavigationListener(unsubscribers.pop());
    }
  };

  const clearTransitionFallback = () => {
    if (!transitionFallbackTimer) {
      return;
    }

    clearTimeout(transitionFallbackTimer);
    transitionFallbackTimer = undefined;
  };

  const scheduleIdle = () => {
    if (controller.signal.aborted || didScheduleIdle || transitionInProgress) {
      return;
    }

    didScheduleIdle = true;
    clearTransitionFallback();
    clearTransitionListeners();
    idleTask = scheduleAfterInteractionsAndFrames({
      fallbackMs: args.idleTimeoutMs,
      onError: args.onError,
      callback: () => args.callback(controller.signal),
    });
    idleTask.done.finally(finish);
  };

  const onTransitionStart = (event: NavigationTransitionEvent) => {
    if (!event.data?.closing) {
      transitionInProgress = true;
    }
  };

  const onTransitionEnd = (event: NavigationTransitionEvent) => {
    if (event.data?.closing) {
      return;
    }

    transitionInProgress = false;
    scheduleIdle();
  };

  const transitionNavigations = [
    args.navigation,
    args.navigation.getParent?.(),
  ].filter(
    (navigation, index, allNavigations): navigation is TransitionNavigation =>
      !!navigation && allNavigations.indexOf(navigation) === index,
  );

  for (const navigation of transitionNavigations) {
    if (typeof navigation.addListener !== 'function') {
      continue;
    }

    unsubscribers.push(
      navigation.addListener('transitionStart', onTransitionStart),
      navigation.addListener('transitionEnd', onTransitionEnd),
    );
  }

  const waitForTransitionFallback = () => {
    transitionFallbackTimer = undefined;
    if (controller.signal.aborted || didScheduleIdle) {
      return;
    }

    if (transitionInProgress) {
      transitionFallbackTimer = setTimeout(waitForTransitionFallback, 100);
      return;
    }

    scheduleIdle();
  };

  transitionFallbackTimer = setTimeout(
    waitForTransitionFallback,
    Math.max(
      0,
      Math.floor(args.transitionFallbackMs ?? DEFAULT_TRANSITION_FALLBACK_MS),
    ),
  );

  return {
    cancel: () => {
      if (controller.signal.aborted) {
        return;
      }

      controller.abort();
      clearTransitionFallback();
      clearTransitionListeners();
      idleTask?.cancel();
      finish();
    },
    done,
    signal: controller.signal,
  };
};
