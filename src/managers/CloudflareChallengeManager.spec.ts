import {
  cloudflareChallengeManager,
  PRESENT_TIMEOUT_MS,
} from './CloudflareChallengeManager';

jest.mock('./LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const URL = 'https://bitpay.com/auth/login';

describe('CloudflareChallengeManager', () => {
  afterEach(() => {
    // Settle any presentation a test left open so state can't leak across tests.
    cloudflareChallengeManager.resolve(false);
  });

  it('starts hidden', () => {
    expect(cloudflareChallengeManager.getState()).toEqual({isVisible: false});
  });

  it('present() shows the challenge and resolve(true) settles it', async () => {
    const pending = cloudflareChallengeManager.present(URL);

    expect(cloudflareChallengeManager.getState()).toEqual({
      isVisible: true,
      url: URL,
    });

    cloudflareChallengeManager.resolve(true);

    await expect(pending).resolves.toBe(true);
    expect(cloudflareChallengeManager.getState().isVisible).toBe(false);
  });

  it('resolve(false) settles a dismissal', async () => {
    const pending = cloudflareChallengeManager.present(URL);
    cloudflareChallengeManager.resolve(false);
    await expect(pending).resolves.toBe(false);
  });

  it('concurrent presenters share one presentation and one outcome', async () => {
    const listener = jest.fn();
    const unsubscribe = cloudflareChallengeManager.subscribe(listener);
    listener.mockClear(); // drop the immediate snapshot emit

    const first = cloudflareChallengeManager.present(URL);
    const second = cloudflareChallengeManager.present(
      'https://bitpay.com/other',
    );

    // Only the first presentation shows; the second joins it.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(cloudflareChallengeManager.getState().url).toBe(URL);

    cloudflareChallengeManager.resolve(true);

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);

    unsubscribe();
  });

  it('subscribe() emits the current state immediately and stops after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = cloudflareChallengeManager.subscribe(listener);

    expect(listener).toHaveBeenCalledWith({isVisible: false});

    unsubscribe();
    listener.mockClear();

    const pending = cloudflareChallengeManager.present(URL);
    expect(listener).not.toHaveBeenCalled();

    cloudflareChallengeManager.resolve(false);
    return pending;
  });

  it('resolve() with nothing pending is a no-op', () => {
    expect(() => cloudflareChallengeManager.resolve(true)).not.toThrow();
    expect(cloudflareChallengeManager.getState().isVisible).toBe(false);
  });

  it('times out as unsolved if nothing ever settles the challenge', async () => {
    jest.useFakeTimers();
    try {
      const pending = cloudflareChallengeManager.present(URL);

      jest.advanceTimersByTime(PRESENT_TIMEOUT_MS);

      await expect(pending).resolves.toBe(false);
      expect(cloudflareChallengeManager.getState().isVisible).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('resolving normally cancels the safety timeout', async () => {
    jest.useFakeTimers();
    try {
      const pending = cloudflareChallengeManager.present(URL);
      cloudflareChallengeManager.resolve(true);
      await expect(pending).resolves.toBe(true);

      // A second presentation right away must not be killed by the first
      // presentation's stale timeout.
      const secondPending = cloudflareChallengeManager.present(URL);
      jest.advanceTimersByTime(PRESENT_TIMEOUT_MS - 1);
      expect(cloudflareChallengeManager.getState().isVisible).toBe(true);

      cloudflareChallengeManager.resolve(true);
      await expect(secondPending).resolves.toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
