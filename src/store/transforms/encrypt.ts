import crypto from 'crypto';
import Aes from 'crypto-js/aes.js';
import CryptoJsCore from 'crypto-js/core.js';
import {Network} from '../../constants';
import {
  walletProtectedFields,
  identityProtectedFields,
  giftCardProtectedFields,
  walletFieldContext,
  identityFieldContext,
  giftCardFieldContext,
} from './persist-encryption';

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

export const hasProtectedValue = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== '';

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
  modernOnly = false,
): any => {
  if (!hasProtectedValue(value)) {
    return value;
  }

  if (typeof value !== 'string' || !isEncryptedValue(value)) {
    throw new Error(`Expected encrypted protected value at ${context}`);
  }

  if (value.startsWith(modernEncryptedPrefix)) {
    return decryptWithAesGcm(value, secretKey, modernEncryptedPrefix, context);
  }

  if (modernOnly) throw new Error('Expected authenticated protected value');
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
  checkCondition: (value: any) => boolean,
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

    const updatedProperties = walletProtectedFields.reduce(
      (latestProperties, field) => {
        const value = properties[field];
        if (hasProtectedValue(value) && checkCondition(value)) {
          latestProperties[field] = transformer(
            value,
            secretKey,
            walletFieldContext(keyId, field),
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

// Generic function to transform app store (encrypt or decrypt)
const transformAppStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string, context: string) => any,
  checkCondition: (value: any) => boolean,
): any => {
  if (!state || !state.identity) {
    return state;
  }

  const identity = state.identity[Network.mainnet];
  if (!identity) {
    return state;
  }

  const [field] = identityProtectedFields;
  const privValue = identity[field];
  if (hasProtectedValue(privValue) && checkCondition(privValue)) {
    return {
      ...state,
      identity: {
        ...state.identity,
        [Network.mainnet]: {
          ...identity,
          [field]: transformer(
            privValue,
            secretKey,
            identityFieldContext(field),
          ),
        },
      },
    };
  }
  return state;
};

// Generic function to transform shop store (encrypt or decrypt)
const transformShopStore = (
  state: any,
  secretKey: string,
  transformer: (value: any, secretKey: string, context: string) => any,
  checkCondition: (value: any) => boolean,
): any => {
  if (!state || !state.giftCards || !state.giftCards[Network.mainnet]) {
    return state;
  }

  const giftCards = state.giftCards[Network.mainnet];
  if (!Array.isArray(giftCards)) {
    return state;
  }

  // Transform each gift card in mainnet
  const newGiftCards = giftCards.map((card: any) => {
    const updatedCard = {...card};
    giftCardProtectedFields.forEach(field => {
      const value = card[field];
      if (hasProtectedValue(value) && checkCondition(value)) {
        updatedCard[field] = transformer(
          value,
          secretKey,
          giftCardFieldContext(card.invoiceId, field),
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

const storeEncryptor =
  (walk: typeof transformWalletStore) =>
  (state: any, secretKey: string): any =>
    walk(
      state,
      secretKey,
      encryptValue,
      value => typeof value === 'string' && !isEncryptedValue(value),
    );

const storeDecryptor =
  (walk: typeof transformWalletStore) =>
  (state: any, secretKey: string, modernOnly = false): any =>
    walk(
      state,
      secretKey,
      (value, key, context) => decryptValue(value, key, context, modernOnly),
      () => true,
    );

export const encryptWalletStore = storeEncryptor(transformWalletStore);
export const decryptWalletStore = storeDecryptor(transformWalletStore);
export const encryptAppStore = storeEncryptor(transformAppStore);
export const decryptAppStore = storeDecryptor(transformAppStore);
export const encryptShopStore = storeEncryptor(transformShopStore);
export const decryptShopStore = storeDecryptor(transformShopStore);

// The active reader accepts only modern authentication (plus designated public
// reducer JSON). Legacy decoding belongs exclusively to the transfer codec.
export const deserializeModernPersistValue = (
  value: unknown,
  secretKey: string,
  key: string,
  allowPlainJson: boolean,
): any => {
  if (typeof value !== 'string') throw new Error('Expected serialized reducer');
  if (allowPlainJson) {
    try {
      return JSON.parse(value);
    } catch {}
  }
  if (!value.startsWith(persistEncryptedPrefix))
    throw new Error('Expected authenticated reducer');
  return decryptPersistValue(value, secretKey, `persist:${key}`);
};
