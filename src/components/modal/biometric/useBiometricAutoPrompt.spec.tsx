import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {AppState} from 'react-native';
import {
  BIOMETRIC_PROMPT_SETTLE_MS,
  useBiometricAutoPrompt,
} from './useBiometricAutoPrompt';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Status = 'active' | 'inactive' | 'background';

describe('useBiometricAutoPrompt', () => {
  let listener: ((status: Status) => void) | undefined;
  const remove = jest.fn();
  let currentState: Status;
  let requestPrompt: () => Promise<void>;

  // Async `act` so promise continuations (like the in-flight guard release)
  // run before the next step.
  const setAppState = async (status: Status) => {
    currentState = status;
    await act(async () => {
      listener?.(status);
    });
  };
  const advance = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  const Harness = ({
    enabled,
    prompt,
  }: {
    enabled: boolean;
    prompt: () => Promise<void>;
  }) => {
    requestPrompt = useBiometricAutoPrompt(enabled, prompt);
    return null;
  };

  const mount = (prompt: () => Promise<void>, enabled = true) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <Harness enabled={enabled} prompt={prompt} />,
      );
    });
    return renderer;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    listener = undefined;
    remove.mockClear();
    currentState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => currentState,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type: any, cb: any) => {
        listener = cb;
        return {remove} as any;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('prompts once after the settle delay when mounted in the foreground', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);

    await advance(BIOMETRIC_PROMPT_SETTLE_MS - 1);
    expect(prompt).not.toHaveBeenCalled();
    await advance(1);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when disabled', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt, false);

    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 2);
    expect(prompt).not.toHaveBeenCalled();
    expect(listener).toBeUndefined();
  });

  it('does not prompt on the brief inactive -> active -> inactive -> background sequence of a screen lock', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    // Initial prompt already attempted.
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(1);
    prompt.mockClear();

    // Back to a clean state: the app is locked while the modal is visible
    // and an auto prompt is pending (the app just came back from background).
    await setAppState('inactive');
    await setAppState('background');
    await setAppState('inactive');
    await setAppState('active'); // blip, schedules a prompt
    await setAppState('inactive'); // cancels it
    await setAppState('background');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 3);

    expect(prompt).not.toHaveBeenCalled();
  });

  it('prompts exactly once when returning to active from background', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    prompt.mockClear();

    await setAppState('inactive');
    await setAppState('background');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 3);
    expect(prompt).not.toHaveBeenCalled();

    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(1);

    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 3);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('does not re-prompt when the system sheet toggles inactive -> active after a cancel', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(1);

    // Face ID sheet shows and is dismissed after a cancel/failure.
    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 5);

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('does not auto-prompt after a manual request made before the pending auto timer fires', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    prompt.mockClear();

    // Modal already open, app goes to background and comes back.
    await setAppState('inactive');
    await setAppState('background');
    await setAppState('inactive');
    await setAppState('active'); // schedules the auto prompt

    // User taps the logo before the 300 ms timer fires.
    await advance(BIOMETRIC_PROMPT_SETTLE_MS - 100);
    await act(async () => {
      await requestPrompt();
    });
    expect(prompt).toHaveBeenCalledTimes(1);

    // Face ID sheet goes inactive and back to active after Cancel.
    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 5);

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('does not auto-prompt after a manual request made while the app was inactive after background', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    prompt.mockClear();

    await setAppState('inactive');
    await setAppState('background');
    await act(async () => {
      await requestPrompt();
    });
    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 5);

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('prompts again after the app returns from background even if the previous prompt was cancelled', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 2);
    expect(prompt).toHaveBeenCalledTimes(1);

    await setAppState('inactive');
    await setAppState('background');
    await setAppState('inactive');
    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it('still prompts if the app goes inactive before the first prompt fires', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    mount(prompt);

    await setAppState('inactive'); // e.g. control center pulled down
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 2);
    expect(prompt).not.toHaveBeenCalled();

    await setAppState('active');
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('clears the pending timer and the listener on unmount', async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    const baselineTimers = jest.getTimerCount();
    const renderer = mount(prompt);
    expect(jest.getTimerCount()).toBe(baselineTimers + 1);

    act(() => {
      renderer.unmount();
    });
    // The hook's own timer is gone as soon as it unmounts.
    expect(jest.getTimerCount()).toBe(baselineTimers);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS * 3);

    expect(prompt).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does not open concurrent prompts', async () => {
    let resolvePrompt!: () => void;
    const prompt = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolvePrompt = resolve;
        }),
    );
    mount(prompt);
    await advance(BIOMETRIC_PROMPT_SETTLE_MS);
    expect(prompt).toHaveBeenCalledTimes(1);

    // Manual taps while the first prompt is still in flight are ignored.
    await act(async () => {
      await requestPrompt();
      await requestPrompt();
    });
    expect(prompt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePrompt();
    });

    // Once it settles, a manual retry is allowed again.
    act(() => {
      requestPrompt();
    });
    expect(prompt).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolvePrompt();
    });
  });

  it('releases the in-flight guard when the prompt throws', async () => {
    const prompt = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined);
    mount(prompt, false);

    await act(async () => {
      await requestPrompt().catch(() => undefined);
    });
    await act(async () => {
      await requestPrompt();
    });

    expect(prompt).toHaveBeenCalledTimes(2);
  });
});
