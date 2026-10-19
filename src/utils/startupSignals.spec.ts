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

describe('useStartupSettled with a delay', () => {
  // Rendered through a tiny harness so the hook's effect timing is real.
  const {act, create} = require('react-test-renderer');
  const React = require('react');
  const {useStartupSettled} = require('./startupSignals');

  beforeEach(() => {
    jest.useFakeTimers();
    resetStartupSignalsForTests();
    (global as any).requestIdleCallback = undefined;
  });
  afterEach(() => jest.useRealTimers());

  it('stays false until the delay after settling has passed', () => {
    const seen: boolean[] = [];
    const Probe = () => {
      seen.push(useStartupSettled(5000));
      return null;
    };
    act(() => {
      create(React.createElement(Probe));
    });
    act(() => {
      markFirstScreenShown();
      jest.advanceTimersByTime(10); // idle → settled
    });
    expect(seen[seen.length - 1]).toBe(false);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(seen[seen.length - 1]).toBe(true);
  });
});
