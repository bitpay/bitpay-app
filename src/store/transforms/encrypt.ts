import Aes from 'crypto-js/aes.js';
import CryptoJsCore from 'crypto-js/core.js';
import {Network} from '../../constants';

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
      'xPrivKeyEDDSA',
      'xPrivKeyEDDSAEncrypted',
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

// Generic function to transform app store (encrypt or decrypt)
const transformAppStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string) => any,
  checkCondition: (value: string) => boolean,
): any => {
  if (!state || !state.identity) {
    return state;
  }

  const identity = state.identity[Network.mainnet];
  if (!identity || !identity.priv) {
    return state;
  }

  const privValue = identity.priv;
  if (privValue && typeof privValue === 'string' && checkCondition(privValue)) {
    return {
      ...state,
      identity: {
        ...state.identity,
        [Network.mainnet]: {
          ...identity,
          priv: transformer(privValue, secretKey),
        },
      },
    };
  }
  return state;
};

export const encryptAppStore = (state: any, secretKey: string): any => {
  return transformAppStore(
    state,
    secretKey,
    encryptValue,
    value => !value.startsWith(encryptedPrefix),
  );
};

export const decryptAppStore = (state: any, secretKey: string): any => {
  return transformAppStore(state, secretKey, decryptValue, value =>
    value.startsWith(encryptedPrefix),
  );
};

// Generic function to transform shop store (encrypt or decrypt)
const transformShopStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string) => any,
  checkCondition: (value: string) => boolean,
): any => {
  if (!state || !state.giftCards || !state.giftCards[Network.mainnet]) {
    return state;
  }

  const giftCards = state.giftCards[Network.mainnet];
  if (!Array.isArray(giftCards)) {
    return state;
  }

  const fieldsToTransform = [
    'accessKey',
    'barcodeData',
    'barcodeImage',
    'claimCode',
    'claimLink',
    'pin',
  ];

  // Transform each gift card in mainnet
  const newGiftCards = giftCards.map((card: any) => {
    const updatedCard = {...card};
    fieldsToTransform.forEach(field => {
      const value = card[field];
      if (value && typeof value === 'string' && checkCondition(value)) {
        updatedCard[field] = transformer(value, secretKey);
      }
    });
    // Always set invoice to undefined for persisted state
    updatedCard.invoice = undefined;
    return updatedCard;
  });

  return {
    ...state,
    giftCards: {
      ...state.giftCards,
      [Network.mainnet]: newGiftCards,
    },
  };
};

export const encryptShopStore = (state: any, secretKey: string): any => {
  return transformShopStore(
    state,
    secretKey,
    encryptValue,
    value => !value.startsWith(encryptedPrefix),
  );
};

export const decryptShopStore = (state: any, secretKey: string): any => {
  return transformShopStore(state, secretKey, decryptValue, value =>
    value.startsWith(encryptedPrefix),
  );
};
