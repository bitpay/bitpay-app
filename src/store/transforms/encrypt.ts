import Aes from 'crypto-js/aes.js';
import CryptoJsCore from 'crypto-js/core.js';

const encryptedPrefix = 'encrypted:';

export const encryptValue = (value: any, secretKey: string): string => {
  // Skip encryption for already encrypted values
  if (typeof value === 'string' && value.startsWith(encryptedPrefix)) {
    return value;
  }

  try {
    const encrypted = Aes.encrypt(String(value), secretKey).toString();
    const result = `${encryptedPrefix}${encrypted}`;
    return result;
  } catch (err) {
    return value;
  }
};

export const decryptValue = (value: any, secretKey: string): any => {
  // Skip decryption for non-encrypted values
  if (typeof value !== 'string' || !value.startsWith(encryptedPrefix)) {
    return value;
  }
  try {
    const encryptedText = value.replace(encryptedPrefix, '');
    const result = Aes.decrypt(encryptedText, secretKey).toString(
      CryptoJsCore.enc.Utf8,
    );
    if (!result) {
      throw new Error('Decrypted string is empty');
    }
    return result;
  } catch (err) {
    return value;
  }
};

// Generic function to transform wallet store (encrypt or decrypt)
const transformWalletStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string) => any,
  checkCondition: (value: string) => boolean,
): any => {
  if (!state || !state.keys) {
    return state;
  }

  // Create a copy of the state to maintain immutability
  const newState = {...state};

  Object.keys(state.keys).forEach(keyId => {
    const properties = state.keys[keyId]?.properties;
    if (!properties) {
      return;
    }

    const fieldsToTransform = [
      'mnemonic',
      'mnemonicEncrypted',
      'xPrivKey',
      'xPrivKeyEncrypted',
    ];
    const updatedProperties = fieldsToTransform.reduce(
      (latestProperties, field) => {
        const value = properties[field];
        if (value && typeof value === 'string' && checkCondition(value)) {
          latestProperties[field] = transformer(value, secretKey);
        }
        return latestProperties;
      },
      {...properties},
    );
    newState.keys = {
      ...newState.keys,
      [keyId]: {
        ...newState.keys[keyId],
        properties: updatedProperties,
      },
    };
  });

  return newState;
};

export const encryptWalletStore = (state: any, secretKey: string): any => {
  return transformWalletStore(
    state,
    secretKey,
    encryptValue,
    value => !value.startsWith(encryptedPrefix),
  );
};

export const decryptWalletStore = (state: any, secretKey: string): any => {
  return transformWalletStore(state, secretKey, decryptValue, value =>
    value.startsWith(encryptedPrefix),
  );
};
