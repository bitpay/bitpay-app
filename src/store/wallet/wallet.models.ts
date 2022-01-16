import {Key as IKey} from 'bitcore-wallet-client/src/lib/key';
import {Token} from '../../constants/assets';
import API from 'bitcore-wallet-client/ts_build';

export interface KeyObj {
  compliantDerivation: boolean;
  fingerPrint: string;
  id: string;
  mnemonic: string;
  mnemonicHasPassphrase: boolean;
  version: number;
  xPrivKey: string;
}

export interface Asset extends AssetObj, API {}

export interface AssetObj {
  id: string;
  assetName: string;
  assetAbbreviation: string;
  balance?: number;
  tokens?: [Token];
}

export interface WalletObj {
  id: string;
  assets: Asset[];
  backupComplete?: boolean;
  show?: boolean;
  totalBalance?: number;
  isPrivKeyEncrypted?: boolean;
}

export interface Key extends IKey {}

export interface ExchangeRate {
  ts?: number;
  rate?: number;
  fetchedOn?: number;
  code?: string;
  name?: string;
}

export interface PriceHistory {
  coin: string;
  priceDisplay: Array<number>;
  percentChange: string;
  currencyPair: string;
}

export interface WalletOptions {
  keyId: any;
  name: any;
  m: any;
  n: any;
  myName: any;
  networkName: string;
  bwsurl: any;
  singleAddress: any;
  coin: string;
  extendedPrivateKey: any;
  mnemonic: any;
  derivationStrategy: any;
  secret: any;
  account: any;
  passphrase: any;
  walletPrivKey: any;
  compliantDerivation: any;
  useLegacyCoinType?: boolean;
  useLegacyPurpose?: boolean;
  useNativeSegwit?: boolean;
  words?: string;
}

export interface KeyMethods {
  _checkCoin: Function;
  _checkNetwork: Function;
  checkPassword: Function;
  compliantDerivation: boolean;
  createAccess: Function;
  createCredentials: Function;
  decrypt: Function;
  derive: Function;
  encrypt: Function;
  fingerPrint: string;
  id: string;
  get: Function;
  getBaseAddressDerivationPath: Function;
  isPrivKeyEncrypted: Function;
  sign: Function;
  toObj: Function;
  use0forBCH: any;
  use44forMultisig: any;
}

export interface ExtendedKeyValues extends KeyObj, KeyMethods {}
