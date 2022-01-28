import API from 'bitcore-wallet-client/ts_build';
import {ReactElement} from 'react';

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

export interface KeyProperties {
  compliantDerivation: boolean;
  fingerPrint: string;
  id: string;
  mnemonic: string;
  mnemonicHasPassphrase: boolean;
  version: number;
  xPrivKey: string;
}

export interface Key {
  id: string;
  wallets: Wallet[];
  properties: KeyProperties;
  methods: KeyMethods;
  backupComplete?: boolean;
  show?: boolean;
  totalBalance?: number;
  isPrivKeyEncrypted?: boolean;
}

export interface Wallet extends WalletObj, API {}

export interface WalletObj {
  id: string;
  currencyName: string;
  currencyAbbreviation: string;
  balance?: number;
  tokens?: string[];
  preferences?: {
    tokenAddresses?: [];
  };
  img: string | ((props?: any) => ReactElement);
}

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

export interface KeyOptions {
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

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
}
