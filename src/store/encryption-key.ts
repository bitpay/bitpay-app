type SelectNewEncryptionKeyOptions = {
  hasPersistedRoot: () => boolean;
  hasBackup: () => Promise<boolean>;
  getLegacyKey: () => string;
  getRandomKey: () => string;
};

export const selectNewEncryptionKey = async ({
  hasPersistedRoot,
  hasBackup,
  getLegacyKey,
  getRandomKey,
}: SelectNewEncryptionKeyOptions): Promise<{
  key: string;
  legacyCompatible: boolean;
}> => {
  const legacyCompatible = hasPersistedRoot() || (await hasBackup());

  return {
    key: legacyCompatible ? getLegacyKey() : getRandomKey(),
    legacyCompatible,
  };
};

type SetGenericPassword =
  typeof import('react-native-keychain').setGenericPassword;

export const storeEncryptionKey = async (
  encryptionKeyId: string,
  key: string,
  setGenericPassword: SetGenericPassword,
): Promise<void> => {
  const result = await setGenericPassword(encryptionKeyId, key, {
    service: encryptionKeyId,
  });

  if (!result) {
    throw new Error('Keychain did not store the encryption key');
  }
};
