import {useSelector} from 'react-redux';
import {Key, KeyProperties, Wallet} from '../wallet/wallet.models';
import {
  initialWalletSecretsState,
  WalletCredentialSecrets,
  WalletSecretsState,
} from './wallet-secrets.reducer';

// Typed structurally rather than with RootState: importing it from the store
// index would close an import cycle.
interface SecretsStateShape {
  WALLET: {keys: {[id: string]: Key}};
  WALLET_SECRETS: WalletSecretsState;
}

const selectSecrets = (state: SecretsStateShape): WalletSecretsState =>
  state.WALLET_SECRETS || initialWalletSecretsState;

export const selectKeyProperties = (
  state: SecretsStateShape,
  keyId: string,
): KeyProperties | undefined => selectSecrets(state).byKeyId[keyId];

export const selectWalletSecrets = (
  state: SecretsStateShape,
  walletId: string,
): WalletCredentialSecrets | undefined =>
  selectSecrets(state).byWalletId[walletId];

// The BWC client needs the full credentials object; the store copy has none.
export const withCredentialSecrets = (
  wallet: Wallet,
  secrets: WalletSecretsState,
): Wallet => {
  const walletSecrets = secrets.byWalletId[wallet.id];
  if (!walletSecrets) {
    return wallet;
  }
  const merged = Object.create(
    Object.getPrototypeOf(wallet) || Object.prototype,
    Object.getOwnPropertyDescriptors(wallet),
  ) as Wallet;
  merged.credentials = {...(wallet as any).credentials, ...walletSecrets};
  return merged;
};

export const useKeyProperties = (keyId: string): KeyProperties | undefined =>
  useSelector((state: SecretsStateShape) => selectKeyProperties(state, keyId));
