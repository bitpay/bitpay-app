import {Key as IKey} from 'bitcore-wallet-client/src/lib/key';

export interface KeyObj {
  compliantDerivation: boolean;
  fingerPrint: string;
  id: string;
  mnemonic: string;
  mnemonicHasPassphrase: boolean;
  version: number;
  xPrivKey: string;
}

export interface WalletObj {
  id: string;
  assets: [object];
  backupComplete?: boolean;
}

export interface Key extends IKey {}
