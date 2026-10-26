import {Network} from '../../constants';

export const walletProtectedFields = [
  'mnemonic',
  'mnemonicEncrypted',
  'xPrivKey',
  'xPrivKeyEncrypted',
  'xPrivKeyEDDSA',
  'xPrivKeyEDDSAEncrypted',
] as const;
export const identityProtectedFields = ['priv'] as const;
export const giftCardProtectedFields = [
  'accessKey',
  'barcodeData',
  'barcodeImage',
  'claimCode',
  'claimLink',
  'pin',
] as const;

export const walletFieldContext = (keyId: string, field: string) =>
  `WALLET.keys.${keyId}.properties.${field}`;
export const identityFieldContext = (field: string) =>
  `APP.identity.${Network.mainnet}.${field}`;
export const giftCardFieldContext = (invoiceId: unknown, field: string) =>
  `SHOP.giftCards.${Network.mainnet}.${invoiceId}.${field}`;

export const object = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const unencryptedPersistStores = new Set([
  'APP',
  'MARKET_STATS',
  'PORTFOLIO',
  'RATE',
  'SHOP',
  'SHOP_CATALOG',
  'WALLET',
]);
