import {NativeModules, Platform} from 'react-native';

/**
 * DEV-only helpers to validate crash reporting (Sentry).
 */

interface CrashTestNativeModule {
  crash(): void;
}

const CrashTest = NativeModules.CrashTest as CrashTestNativeModule | undefined;

export const triggerNativeCrash = (): void => {
  if (!CrashTest?.crash) {
    throw new Error(
      `CrashTest native module unavailable on ${Platform.OS}. ` +
        'Rebuild the native app (the JS bundle alone is not enough).',
    );
  }
  CrashTest.crash();
};

export const triggerJsCrash = (): void => {
  setTimeout(() => {
    throw new Error('BitPay test: JS crash (Sentry)');
  }, 0);
};
