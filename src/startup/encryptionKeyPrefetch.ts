import * as Keychain from 'react-native-keychain';

/**
 * The persisted store is encrypted with a key kept in the Keychain (Android
 * Keystore). Reading it is a native round trip of ~100 ms, and the store
 * cannot be created until it returns — while the JS thread has nothing to
 * do. index.js imports ./startEncryptionKeyPrefetch first, so the read runs
 * on the native side while the rest of the bundle is still being evaluated.
 *
 * The vault's first key read (modernKey in src/store/vault-runtime.ts) takes
 * this promise once and handles every outcome exactly as it handles its own
 * read; if it is never taken (tests, another entry point), it reads the
 * Keychain itself as before. Only that first read may take it: the vault key
 * is written solely after that read, so the prefetched value cannot be stale.
 *
 * This module has no side effects so the vault can import it without starting
 * a read (in tests, that read would hit the Keychain mock before setup).
 */
// Must match VAULT_KEY_SERVICE in src/store/encryption-key.ts (asserted in
// the spec). Not imported from there: that module pulls in `crypto`, which
// must not load before index.js installs quick-crypto.
export const ENCRYPTION_KEY_SERVICE = 'bitpay-app-vault-key-v1';

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
