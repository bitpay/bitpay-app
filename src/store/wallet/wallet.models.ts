import {Key as IKey} from 'bitcore-wallet-client/src/lib/key';

export interface KeyProfile {
  createdOn?: number;
  credentials?: any;
}

export interface KeyObj {
  compliantDerivation: boolean;
  fingerPrint: string;
  id: string;
  mnemonic: string;
  mnemonicHasPassphrase: boolean;
  version: number;
  xPrivKey: string;
}

export interface Key extends IKey {}
