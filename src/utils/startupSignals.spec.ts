import {
  isStartupSettled,
  markFirstScreenShown,
  resetStartupSignalsForTests,
  whenStartupSettled,
} from './startupSignals';

describe('startupSignals', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetStartupSignalsForTests();
    (global as any).requestIdleCallback = undefined;
  });
  afterEach(() => jest.useRealTimers());

  it('settles after the first screen is shown and the thread goes idle', () => {
    const cb = jest.fn();
    whenStartupSettled(cb);
    expect(cb).not.toHaveBeenCalled();

    markFirstScreenShown();
    expect(cb).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(isStartupSettled()).toBe(true);
  });

  it('runs late subscribers immediately once settled', () => {
    markFirstScreenShown();
    jest.runOnlyPendingTimers();
    const cb = jest.fn();
    whenStartupSettled(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('lets a subscriber unsubscribe before settling', () => {
    const cb = jest.fn();
    const unsubscribe = whenStartupSettled(cb);
    unsubscribe();
    markFirstScreenShown();
    jest.runOnlyPendingTimers();
    expect(cb).not.toHaveBeenCalled();
  });
});
