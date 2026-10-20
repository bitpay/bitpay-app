import * as Keychain from 'react-native-keychain';

/**
 * The persisted store is encrypted with a key kept in the Keychain (Android
 * Keystore). Reading it is a native round trip of ~100 ms, and the store
 * cannot be created until it returns — while the JS thread has nothing to
 * do. index.js imports this module first, so the read runs on the native
 * side while the rest of the bundle is still being evaluated.
 *
 * getEncryptionKey (src/store) takes this promise once and handles every
 * outcome exactly as it handles its own read; if it is never taken (tests,
 * another entry point), it reads the Keychain itself as before.
 */
export const ENCRYPTION_KEY_SERVICE = 'bitpay-app-encryption-key';

let prefetched: ReturnType<typeof Keychain.getGenericPassword> | undefined;

export const prefetchEncryptionKey = (): void => {
  if (prefetched) {
    return;
  }
  try {
    prefetched = Keychain.getGenericPassword({service: ENCRYPTION_KEY_SERVICE});
    // Marks the promise as handled; the consumer still sees the rejection.
    prefetched.catch(() => {});
  } catch {
    prefetched = undefined;
  }
};

/** The in-flight read, at most once; undefined if none was started. */
export const takePrefetchedEncryptionKey = ():
  | ReturnType<typeof Keychain.getGenericPassword>
  | undefined => {
  const result = prefetched;
  prefetched = undefined;
  return result;
};

prefetchEncryptionKey();
