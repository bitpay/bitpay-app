import crypto from 'crypto';
import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {vaultError, safeVaultError} from './vault-diagnostics';

export const LEGACY_KEY_SERVICE = 'bitpay-app-encryption-key';
export const VAULT_KEY_SERVICE = 'bitpay-app-vault-key-v1';

export const readVaultKey = async () => {
  try {
    return await Keychain.getGenericPassword({service: VAULT_KEY_SERVICE});
  } catch (error) {
    throw safeVaultError(
      error,
      'MODERN_KEY_FAILURE',
      'key',
      'KEY_UNAVAILABLE',
      'key',
    );
  }
};

export const hasRequiredBackend = (
  entry: Pick<Keychain.UserCredentials, 'storage'>,
): boolean =>
  Platform.OS !== 'android' ||
  entry.storage === Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH;

export const validatedVaultKey = (
  entry: false | Keychain.UserCredentials,
): string => {
  if (!entry || !hasRequiredBackend(entry)) {
    throw vaultError('MODERN_KEY_FAILURE', 'key', 'KEY_UNAVAILABLE', 'key');
  }
  const key = entry.password;
  if (
    typeof key !== 'string' ||
    !/^[A-Za-z0-9+/]{43}=$/.test(key) ||
    Buffer.from(key, 'base64').length !== 32 ||
    Buffer.from(key, 'base64').toString('base64') !== key
  ) {
    throw vaultError('MODERN_KEY_FAILURE', 'key', 'KEY_INVALID', 'key');
  }
  return key;
};

export const createVaultKey = async (): Promise<string> => {
  const key = crypto.randomBytes(32).toString('base64');
  const options: Keychain.SetOptions = {
    service: VAULT_KEY_SERVICE,
    ...(Platform.OS === 'ios'
      ? {accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY}
      : {
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        }),
  };
  const result = await Keychain.setGenericPassword(
    VAULT_KEY_SERVICE,
    key,
    options,
  );
  if (!result || !hasRequiredBackend(result)) {
    throw vaultError('NEW_KEY_VERIFICATION', 'key', 'KEY_STORAGE', 'key');
  }
  try {
    if (validatedVaultKey(await readVaultKey()) !== key) throw new Error();
  } catch {
    throw vaultError('NEW_KEY_VERIFICATION', 'key', 'COPY_VERIFICATION', 'key');
  }
  return key;
};

export const removeKeyAndVerify = async (service: string): Promise<void> => {
  if (!(await Keychain.resetGenericPassword({service}))) {
    throw new Error('Keychain did not remove the entry');
  }
  if (await Keychain.getGenericPassword({service})) {
    throw new Error('Keychain entry remains after deletion');
  }
};
