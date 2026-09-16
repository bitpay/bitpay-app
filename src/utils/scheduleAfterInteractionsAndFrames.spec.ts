import {
  scheduleAfterInteractionsAndFrames,
  scheduleAfterTransitionAndIdle,
} from './scheduleAfterInteractionsAndFrames';

type TransitionEvent = {
  data?: {
    closing?: boolean;
  };
};

describe('scheduleAfterInteractionsAndFrames', () => {
  const originalRequestIdleCallback = (global as any).requestIdleCallback;
  const originalCancelIdleCallback = (global as any).cancelIdleCallback;
  let idleCallbacks: Map<number, () => void>;
  let nextIdleCallbackId: number;

  beforeEach(() => {
    jest.useFakeTimers();
    idleCallbacks = new Map();
    nextIdleCallbackId = 1;
    (global as any).requestIdleCallback = jest.fn(
      (callback: () => void): number => {
        const callbackId = nextIdleCallbackId++;
        idleCallbacks.set(callbackId, callback);
        return callbackId;
      },
    );
    (global as any).cancelIdleCallback = jest.fn((callbackId: number) => {
      idleCallbacks.delete(callbackId);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as any).requestIdleCallback = originalRequestIdleCallback;
    (global as any).cancelIdleCallback = originalCancelIdleCallback;
  });

  const flushIdleCallback = async () => {
    const callback = idleCallbacks.values().next().value as
      | (() => void)
      | undefined;
    expect(callback).toBeDefined();
    callback?.();
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();
  };

  it('runs generic deferred work during an idle period', async () => {
    const callback = jest.fn();

    scheduleAfterInteractionsAndFrames({callback});

    expect(callback).not.toHaveBeenCalled();
    await flushIdleCallback();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('waits for an opening transition to end before requesting idle time', async () => {
    const listeners = new Map<
      'transitionStart' | 'transitionEnd',
      ((event: TransitionEvent) => void)[]
    >();
    const parentNavigation = {
      addListener: jest.fn(
        (
          event: 'transitionStart' | 'transitionEnd',
          listener: (event: TransitionEvent) => void,
        ) => {
          const eventListeners = listeners.get(event) ?? [];
          eventListeners.push(listener);
          listeners.set(event, eventListeners);
          return jest.fn();
        },
      ),
    };
    const navigation = {
      addListener: parentNavigation.addListener,
      getParent: () => parentNavigation,
    };
    const callback = jest.fn();

    scheduleAfterTransitionAndIdle({
      navigation,
      transitionFallbackMs: 50,
      callback,
    });

    listeners
      .get('transitionStart')
      ?.forEach(listener => listener({data: {closing: false}}));
    jest.advanceTimersByTime(500);

    expect((global as any).requestIdleCallback).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();

    listeners
      .get('transitionEnd')
      ?.forEach(listener => listener({data: {closing: false}}));

    expect((global as any).requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    await flushIdleCallback();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('uses a fallback before idle when no transition events are emitted', async () => {
    const navigation = {
      addListener: jest.fn(() => jest.fn()),
    };
    const callback = jest.fn();

    scheduleAfterTransitionAndIdle({
      navigation,
      transitionFallbackMs: 50,
      callback,
    });

    jest.advanceTimersByTime(49);
    expect((global as any).requestIdleCallback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect((global as any).requestIdleCallback).toHaveBeenCalledTimes(1);

    await flushIdleCallback();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels transition listeners and pending idle work', async () => {
    const unsubscribe = jest.fn();
    const navigation = {
      addListener: jest.fn(() => unsubscribe),
    };
    const callback = jest.fn();
    const task = scheduleAfterTransitionAndIdle({
      navigation,
      transitionFallbackMs: 50,
      callback,
    });

    task.cancel();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect((global as any).requestIdleCallback).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});
