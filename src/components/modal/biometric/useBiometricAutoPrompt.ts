import {useCallback, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {useLatestCallback} from '../../../utils/hooks/useLatestCallback';

export const BIOMETRIC_PROMPT_SETTLE_MS = 300;

/**
 * Opens the biometric prompt automatically, but only when the app is really
 * in the foreground, and returns a guarded `requestPrompt` for manual retries.
 *
 * - When the screen locks, iOS can report a short-lived 'active' between
 *   'inactive' and 'background'. The prompt is debounced and re-checked against
 *   `AppState.currentState`, so that blip never reaches the prompt (it would
 *   wake the screen back up).
 * - The system Face ID sheet moves the app to 'inactive' and back to 'active'
 *   by itself. That 'active' must not schedule another prompt, otherwise a
 *   cancel or failure would loop forever. After the automatic attempt, retries
 *   are manual until the app comes back from 'background'.
 * - Only one prompt can be in flight at a time.
 */
export const useBiometricAutoPrompt = (
  enabled: boolean,
  prompt: () => Promise<void>,
) => {
  const latestPrompt = useLatestCallback(prompt);
  const isPromptingRef = useRef(false);

  const requestPrompt = useCallback(async () => {
    if (isPromptingRef.current) {
      return;
    }
    isPromptingRef.current = true;
    try {
      await latestPrompt();
    } finally {
      isPromptingRef.current = false;
    }
  }, [latestPrompt]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let needsAutoPrompt = true;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    const schedulePrompt = () => {
      clearTimer();
      timer = setTimeout(() => {
        timer = undefined;
        if (AppState.currentState === 'active') {
          needsAutoPrompt = false;
          requestPrompt();
        }
      }, BIOMETRIC_PROMPT_SETTLE_MS);
    };

    schedulePrompt();
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        if (needsAutoPrompt) {
          schedulePrompt();
        }
      } else {
        clearTimer();
        if (status === 'background') {
          needsAutoPrompt = true;
        }
      }
    });

    return () => {
      clearTimer();
      subscription.remove();
    };
  }, [enabled, requestPrompt]);

  return requestPrompt;
};
