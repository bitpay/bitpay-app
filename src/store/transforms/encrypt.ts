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
    const result = Aes.decrypt(encryptedText, secretKey).toString(CryptoJsCore.enc.Utf8);
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
  if (!state || !state.keys) return state;
  
  // Create a copy of the state to maintain immutability
  const newState = { ...state };
  
  Object.keys(state.keys).forEach(keyId => {
    const key = state.keys[keyId];
    
    if (key.properties) {
      // Handle xPrivKey
      if (key.properties.xPrivKey && 
          typeof key.properties.xPrivKey === 'string' && 
          checkCondition(key.properties.xPrivKey)) {
        newState.keys = {
          ...newState.keys,
          [keyId]: {
            ...newState.keys[keyId],
            properties: {
              ...newState.keys[keyId].properties,
              xPrivKey: transformer(key.properties.xPrivKey, secretKey)
            }
          }
        };
      }
      
      // Handle mnemonic
      if (key.properties.mnemonic && 
          typeof key.properties.mnemonic === 'string' && 
          checkCondition(key.properties.mnemonic)) {
        newState.keys = {
          ...newState.keys,
          [keyId]: {
            ...newState.keys[keyId],
            properties: {
              ...newState.keys[keyId].properties,
              mnemonic: transformer(key.properties.mnemonic, secretKey)
            }
          }
        };
      }
    }
    
    // For each wallet, transform the credential fields
    if (key.wallets && Array.isArray(key.wallets)) {
      newState.keys = {
        ...newState.keys,
        [keyId]: {
          ...newState.keys[keyId],
          wallets: key.wallets.map((wallet: any) => {
            const newWallet = { ...wallet };
            
            // Transform request.credentials.walletPrivKey if it exists and meets condition
            if (wallet.request?.credentials?.walletPrivKey && 
                typeof wallet.request.credentials.walletPrivKey === 'string' && 
                checkCondition(wallet.request.credentials.walletPrivKey)) {
              newWallet.request = {
                ...newWallet.request,
                credentials: {
                  ...newWallet.request.credentials,
                  walletPrivKey: transformer(wallet.request.credentials.walletPrivKey, secretKey)
                }
              };
            }
            
            // Transform credentials.walletPrivKey if it exists and meets condition
            if (wallet.credentials?.walletPrivKey && 
                typeof wallet.credentials.walletPrivKey === 'string' && 
                checkCondition(wallet.credentials.walletPrivKey)) {
              newWallet.credentials = {
                ...newWallet.credentials,
                walletPrivKey: transformer(wallet.credentials.walletPrivKey, secretKey)
              };
            }
            
            return newWallet;
          })
        }
      };
    }
  });
  
  return newState;
};

export const encryptWalletStore = (state: any, secretKey: string): any => {
  return transformWalletStore(
    state,
    secretKey,
    encryptValue,
    (value) => !value.startsWith(encryptedPrefix),
  );
};

export const decryptWalletStore = (state: any, secretKey: string): any => {
  return transformWalletStore(
    state,
    secretKey,
    decryptValue,
    (value) => value.startsWith(encryptedPrefix),
  );
};
