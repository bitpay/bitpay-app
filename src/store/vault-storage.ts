import {MMKV} from 'react-native-mmkv';

// Fixed destinations. Activation permits access; it never selects a source.
export const modernStorage = new MMKV({id: 'bitpay.wallet.v2'});
let active = false;
export const isVaultActive = () => active;
export const activateVaultStorage = () => {
  active = true;
};
export const requireVaultActive = () => {
  if (!active) throw new Error('Wallet persistence is not active');
};
