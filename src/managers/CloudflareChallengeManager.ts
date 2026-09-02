import {logManager} from './LogManager';

export interface CloudflareChallengeState {
  isVisible: boolean;
  url?: string;
}

type Listener = (state: CloudflareChallengeState) => void;
type Waiter = (solved: boolean) => void;

// Safety net: if the modal can never settle the challenge (not mounted, torn
// down mid-challenge), the login flow must not await present() forever.
export const PRESENT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Presents the Cloudflare interstitial and lets the caller await the outcome.
 *
 * Effects can't render, so this mirrors OngoingProcessManager: a singleton the
 * modal subscribes to, exposing a promise that settles once the user clears the
 * challenge or backs out.
 */
class CloudflareChallengeManager {
  private static instance: CloudflareChallengeManager;

  private listeners = new Set<Listener>();
  private waiters: Waiter[] = [];
  private state: CloudflareChallengeState = {isVisible: false};
  private presentTimeout: ReturnType<typeof setTimeout> | null = null;

  static getInstance(): CloudflareChallengeManager {
    if (!CloudflareChallengeManager.instance) {
      CloudflareChallengeManager.instance = new CloudflareChallengeManager();
    }
    return CloudflareChallengeManager.instance;
  }

  getState(): CloudflareChallengeState {
    return {...this.state};
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Show the interstitial for `url`. Resolves true once the challenge clears,
   * false if the user dismisses it. Concurrent callers share one presentation —
   * several requests are usually challenged at once and one solve covers them.
   */
  present(url: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.waiters.push(resolve);

      if (!this.state.isVisible) {
        this.state = {isVisible: true, url};
        this.presentTimeout = setTimeout(() => {
          logManager.warn(
            '[CloudflareChallengeManager] Challenge timed out without a result.',
          );
          this.resolve(false);
        }, PRESENT_TIMEOUT_MS);
        this.notifyListeners();
      }
    });
  }

  /**
   * Called by the modal once the challenge is cleared or dismissed.
   */
  resolve(solved: boolean): void {
    if (this.presentTimeout) {
      clearTimeout(this.presentTimeout);
      this.presentTimeout = null;
    }

    const waiters = this.waiters;
    this.waiters = [];
    this.state = {isVisible: false, url: undefined};
    this.notifyListeners();

    waiters.forEach(waiter => {
      try {
        waiter(solved);
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[CloudflareChallengeManager] Error resolving waiter:',
          errStr,
        );
      }
    });
  }

  private notifyListeners(): void {
    const data = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[CloudflareChallengeManager] Error notifying listener:',
          errStr,
        );
      }
    });
  }
}

export const cloudflareChallengeManager =
  CloudflareChallengeManager.getInstance();
