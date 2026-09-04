// Root/jailbreak detection (defense-in-depth). See docs/root-jailbreak-detection.md.
import JailMonkey from 'jail-monkey';
import * as Sentry from '@sentry/react-native';
import {t} from 'i18next';
import {logManager} from '../managers/LogManager';

export type DeviceIntegrityReason = 'jailbroken' | 'hook-detected';

export interface DeviceIntegrityResult {
  isCompromised: boolean;
  hookDetected: boolean;
  mockLocationEnabled: boolean;
  reason: DeviceIntegrityReason | null;
}

const CLEAN: DeviceIntegrityResult = {
  isCompromised: false,
  hookDetected: false,
  mockLocationEnabled: false,
  reason: null,
};

// State can't change without a reboot, so cache to avoid repeated native calls.
let cached: DeviceIntegrityResult | null = null;

// Dev-only override to simulate a compromised device (see global seam below).
let devOverride: DeviceIntegrityResult | null = null;

export const getDeviceIntegrity = (
  forceRefresh = false,
): DeviceIntegrityResult => {
  if (__DEV__ && devOverride) {
    return devOverride;
  }
  if (cached && !forceRefresh) {
    return cached;
  }
  try {
    const jailBroken = JailMonkey.isJailBroken();
    const hookDetected = JailMonkey.hookDetected();
    const mockLocationEnabled = JailMonkey.canMockLocation();
    const reason: DeviceIntegrityReason | null = jailBroken
      ? 'jailbroken'
      : hookDetected
      ? 'hook-detected'
      : null;

    cached = {
      isCompromised: jailBroken || hookDetected,
      hookDetected,
      mockLocationEnabled,
      reason,
    };
  } catch (err) {
    // Fail open: a missing native module must never brick the app.
    logManager.warn(
      '[deviceIntegrity] check failed, treating device as clean: ' +
        (err instanceof Error ? err.message : JSON.stringify(err)),
    );
    cached = CLEAN;
  }
  return cached;
};

let sentryMessageSent = false;

export const reportDeviceIntegrityToSentry = (
  result: DeviceIntegrityResult,
  extra?: Record<string, unknown>,
): void => {
  try {
    Sentry.setTag('device.compromised', String(result.isCompromised));
    Sentry.setTag('device.hookDetected', String(result.hookDetected));
    Sentry.setContext('deviceIntegrity', {...result, ...extra});

    if (result.isCompromised && !sentryMessageSent) {
      sentryMessageSent = true;
      Sentry.captureMessage('Device integrity: compromised device detected', {
        level: 'warning',
      });
    }
  } catch {}
};

export const DEVICE_COMPROMISED_ERROR_CODE = 'DEVICE_COMPROMISED';

export class DeviceCompromisedError extends Error {
  readonly name = 'DeviceCompromisedError';
  readonly code = DEVICE_COMPROMISED_ERROR_CODE;
  readonly reason: DeviceIntegrityReason | null;

  constructor(message: string, reason: DeviceIntegrityReason | null) {
    super(message);
    this.reason = reason;
  }
}

export const isDeviceCompromisedError = (
  err: unknown,
): err is DeviceCompromisedError =>
  err instanceof DeviceCompromisedError ||
  (typeof err === 'object' &&
    err !== null &&
    (err as {code?: string}).code === DEVICE_COMPROMISED_ERROR_CODE);

export const deviceCompromisedMessage = (): string =>
  t(
    "For your security, this action isn't available on rooted or jailbroken devices.",
  );

export const assertDeviceIntegrityForSensitiveAction = (
  action: string,
): void => {
  const result = getDeviceIntegrity();
  if (!result.isCompromised) {
    return;
  }

  reportDeviceIntegrityToSentry(result, {
    blockedAction: action,
    blocked: !__DEV__,
  });
  logManager.warn(
    `[deviceIntegrity] sensitive action "${action}" attempted on compromised device (reason: ${result.reason})`,
  );

  // Skip enforcement in dev, unless a compromised device is being simulated.
  if (__DEV__ && !devOverride) {
    return;
  }

  throw new DeviceCompromisedError(deviceCompromisedMessage(), result.reason);
};

// Dev-only console seam: `globalThis.__deviceIntegrity.simulate('jailbroken')`
// to force detection (blocks passkey/signing + tags Sentry) without a rooted
// device; `.clear()` to reset. Stripped from production builds.
if (__DEV__) {
  (globalThis as any).__deviceIntegrity = {
    simulate: (reason: DeviceIntegrityReason = 'jailbroken') => {
      devOverride = {
        isCompromised: true,
        hookDetected: reason === 'hook-detected',
        mockLocationEnabled: false,
        reason,
      };
      cached = null;
      reportDeviceIntegrityToSentry(devOverride, {simulated: true});
      return devOverride;
    },
    clear: () => {
      devOverride = null;
      cached = null;
    },
    get: () => getDeviceIntegrity(true),
  };
}
