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

export interface Asset extends API {
  id: string;
  assetName: string;
  assetAbbreviation: string;
  balance: number;
  tokens?: [Token];
}

export interface WalletObj {
  id: string;
  assets: Asset[];
  backupComplete?: boolean;
  show?: boolean;
  totalBalance?: number;
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
