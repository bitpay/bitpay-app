type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
};

export type DebouncedFunc<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait = 0,
  {leading = false, trailing = true, maxWait}: DebounceOptions = {},
): DebouncedFunc<T> => {
  const maxing = maxWait !== undefined;
  const maxDelay = maxing ? Math.max(maxWait, wait) : 0;
  let lastArgs: Parameters<T> | undefined;
  let result: ReturnType<T> | undefined;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  const invoke = (time: number) => {
    const args = lastArgs as Parameters<T>;
    lastArgs = undefined;
    lastInvokeTime = time;
    result = func(...args);
    return result;
  };

  const remainingWait = (time: number) => {
    const timeWaiting = wait - (time - (lastCallTime ?? 0));
    return maxing
      ? Math.min(timeWaiting, maxDelay - (time - lastInvokeTime))
      : timeWaiting;
  };

  const shouldInvoke = (time: number) => {
    if (lastCallTime === undefined) {
      return true;
    }
    const timeSinceLastCall = time - lastCallTime;
    return (
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && time - lastInvokeTime >= maxDelay)
    );
  };

  const trailingEdge = (time: number) => {
    timerId = undefined;
    if (trailing && lastArgs) {
      return invoke(time);
    }
    lastArgs = undefined;
    return result;
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  };

  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invoke(time) : result;
  };

  const debounced = (...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(time);
      }
      if (maxing) {
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invoke(time);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  };

  debounced.cancel = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    timerId = undefined;
  };

  debounced.flush = () =>
    timerId === undefined ? result : trailingEdge(Date.now());

  return debounced;
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait = 0,
): DebouncedFunc<T> =>
  debounce(func, wait, {leading: true, trailing: true, maxWait: wait});
