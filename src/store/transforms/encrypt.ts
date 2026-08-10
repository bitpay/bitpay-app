import crypto from 'crypto';
import Aes from 'crypto-js/aes.js';
import CryptoJsCore from 'crypto-js/core.js';
import {Network} from '../../constants';

const encryptedPrefix = 'encrypted:';
const modernEncryptedPrefix = 'field-aesgcm-v1:';
const persistEncryptedPrefix = 'persist-aesgcm-v1:';

const aesGcmIvBytes = 12;
const aesGcmTagBytes = 16;
const defaultFieldContext = 'field';
const defaultPersistContext = 'persist';

const isModernEncryptedValue = (value: string) =>
  value.startsWith(modernEncryptedPrefix);

const isLegacyEncryptedValue = (value: string) =>
  value.startsWith(encryptedPrefix);

const isEncryptedValue = (value: string) =>
  isModernEncryptedValue(value) || isLegacyEncryptedValue(value);

const buildAesKey = (secretKey: string): Buffer => {
  return crypto.createHash('sha256').update(secretKey).digest();
};

const decodeCanonicalBase64 = (value: string, label: string): Buffer => {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    throw new Error(`Invalid ${label} encoding`);
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) {
    throw new Error(`Invalid ${label} encoding`);
  }
  return decoded;
};

const parseEncryptedPayload = (
  value: string,
  prefix: string,
): {iv: Buffer; tag: Buffer; payload: Buffer} => {
  const chunks = value.slice(prefix.length).split('.');
  if (chunks.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = decodeCanonicalBase64(chunks[0], 'IV');
  const tag = decodeCanonicalBase64(chunks[1], 'authentication tag');
  const payload = decodeCanonicalBase64(chunks[2], 'ciphertext');

  if (iv.length !== aesGcmIvBytes || tag.length !== aesGcmTagBytes) {
    throw new Error('Invalid encrypted payload dimensions');
  }

  return {iv, tag, payload};
};

const serializeEncryptedPayload = (
  iv: Buffer,
  tag: Buffer,
  payload: Buffer,
) => {
  return `${iv.toString('base64')}.${tag.toString('base64')}.${payload.toString(
    'base64',
  )}`;
};

const serializePersistPayload = (iv: Buffer, tag: Buffer, payload: Buffer) => {
  return `${persistEncryptedPrefix}${serializeEncryptedPayload(
    iv,
    tag,
    payload,
  )}`;
};

const encryptWithAesGcm = (
  value: string,
  secretKey: string,
  context: string,
): {iv: Buffer; tag: Buffer; payload: Buffer} => {
  const iv = crypto.randomBytes(aesGcmIvBytes);
  const key = buildAesKey(secretKey);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const payload = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {iv, tag, payload};
};

const decryptWithAesGcm = (
  value: string,
  secretKey: string,
  prefix: string,
  context?: string,
): string => {
  const {iv, tag, payload} = parseEncryptedPayload(value, prefix);
  const key = buildAesKey(secretKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  if (context) {
    decipher.setAAD(Buffer.from(context, 'utf8'));
  }
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString(
    'utf8',
  );
};

const decryptLegacy = (value: string, secretKey: string): string => {
  const encryptedText = value.startsWith(encryptedPrefix)
    ? value.slice(encryptedPrefix.length)
    : value;
  return Aes.decrypt(encryptedText, secretKey).toString(CryptoJsCore.enc.Utf8);
};

const tryDecryptPersistWithLegacy = (
  value: string,
  secretKey: string,
): string => {
  const decoded = Aes.decrypt(value, secretKey).toString(CryptoJsCore.enc.Utf8);
  if (!decoded) {
    throw new Error('Decrypted value is empty');
  }
  return decoded;
};

export const encryptValue = (
  value: any,
  secretKey: string,
  context = defaultFieldContext,
): string => {
  if (typeof value === 'string' && isEncryptedValue(value)) {
    return value;
  }

  const {iv, tag, payload} = encryptWithAesGcm(
    String(value),
    secretKey,
    context,
  );
  return `${modernEncryptedPrefix}${serializeEncryptedPayload(
    iv,
    tag,
    payload,
  )}`;
};

export const decryptValue = (
  value: any,
  secretKey: string,
  context = defaultFieldContext,
): any => {
  if (typeof value !== 'string' || !isEncryptedValue(value)) {
    return value;
  }

  if (value.startsWith(modernEncryptedPrefix)) {
    return decryptWithAesGcm(value, secretKey, modernEncryptedPrefix, context);
  }

  const legacy = decryptLegacy(value, secretKey);
  if (!legacy) {
    throw new Error('Decrypted string is empty');
  }
  return legacy;
};

export const encryptPersistValue = (
  value: any,
  secretKey: string,
  context = defaultPersistContext,
): string => {
  const serialized = JSON.stringify(value);

  if (typeof serialized === 'undefined') {
    return serialized as unknown as string;
  }

  const {iv, tag, payload} = encryptWithAesGcm(serialized, secretKey, context);
  return serializePersistPayload(iv, tag, payload);
};

export const decryptPersistValue = (
  value: string,
  secretKey: string,
  context = defaultPersistContext,
): any => {
  if (value.startsWith(persistEncryptedPrefix)) {
    return JSON.parse(
      decryptWithAesGcm(value, secretKey, persistEncryptedPrefix, context),
    );
  }

  const legacy = tryDecryptPersistWithLegacy(value, secretKey);
  return JSON.parse(legacy);
};

// Generic function to transform wallet store (encrypt or decrypt)
const transformWalletStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string, context: string) => any,
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
          latestProperties[field] = transformer(
            value,
            secretKey,
            `WALLET.keys.${keyId}.properties.${field}`,
          );
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
    value => !isEncryptedValue(value),
  );
};

export const decryptWalletStore = (state: any, secretKey: string): any => {
  return transformWalletStore(state, secretKey, decryptValue, value =>
    isEncryptedValue(value),
  );
};

// Generic function to transform app store (encrypt or decrypt)
const transformAppStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string, context: string) => any,
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
          priv: transformer(
            privValue,
            secretKey,
            `APP.identity.${Network.mainnet}.priv`,
          ),
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
    value => !isEncryptedValue(value),
  );
};

export const decryptAppStore = (state: any, secretKey: string): any => {
  return transformAppStore(state, secretKey, decryptValue, value =>
    isEncryptedValue(value),
  );
};

// Generic function to transform shop store (encrypt or decrypt)
const transformShopStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string, context: string) => any,
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
  const newGiftCards = giftCards.map((card: any, cardIndex: number) => {
    const updatedCard = {...card};
    fieldsToTransform.forEach(field => {
      const value = card[field];
      if (value && typeof value === 'string' && checkCondition(value)) {
        updatedCard[field] = transformer(
          value,
          secretKey,
          `SHOP.giftCards.${Network.mainnet}.${cardIndex}.${field}`,
        );
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
    value => !isEncryptedValue(value),
  );
};

export const decryptShopStore = (state: any, secretKey: string): any => {
  return transformShopStore(state, secretKey, decryptValue, value =>
    isEncryptedValue(value),
  );
};
