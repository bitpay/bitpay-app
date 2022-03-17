import API from 'bitcore-wallet-client/ts_build';
import {ReactElement} from 'react';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {RootState} from '../index';
import {CardConfig, Invoice} from '../shop/shop.models';

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
  xPrivKeyEncrypted?: string;
  mnemonicEncrypted?: string;
}

export interface Key {
  id: string;
  wallets: Wallet[];
  properties: KeyProperties;
  methods: KeyMethods;
  backupComplete?: boolean;
  show?: boolean;
  totalBalance: number;
  isPrivKeyEncrypted?: boolean;
  keyName?: string;
}

export interface Wallet extends WalletObj, API {}

export interface WalletBalance {
  crypto: string;
  fiat: number;
  sat: number;
}

export interface WalletObj {
  id: string;
  keyId: string;
  currencyName: string;
  currencyAbbreviation: string;
  m: number;
  n: number;
  balance: WalletBalance;
  tokens?: string[];
  walletName?: string;
  preferences?: {
    tokenAddresses?: [];
  };
  img: string | ((props?: any) => ReactElement);
  receiveAddress?: string;
  isRefreshing?: boolean;
  transactionHistory?: {transactions: any[]; loadMore: boolean};
  hideWallet?: boolean;
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
  xPrivKey?: string;
  invitationCode?: string;
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
}

export interface Rate {
  code: string;
  fetchedOn: number;
  name: string;
  rate: number;
  ts: number;
}

export interface HistoricRate {
  fetchedOn: number;
  rate: number;
  ts: number;
}

export type Rates = {
  [key in string]: Rate[];
};

export interface Balance {
  availableAmount: number;
  availableConfirmedAmount: number;
  byAddress: {address: string; path: string; amount: number}[];
  lockedAmount: number;
  lockedConfirmedAmount: number;
  totalAmount: number;
  totalConfirmedAmount: number;
}

export interface _Credentials extends Credentials {
  secret: string;
  copayers: string[];
}
export interface WalletStatus {
  balance: Balance;
  pendingTxps: any[];
  preferences: any;
  serverMessages: any[];
  wallet: _Credentials;
}

export enum CacheKeys {
  RATES = 'ratesCacheKey',
  BALANCE = 'balanceCacheKey',
}

export interface Recipient {
  type?: string;
  name?: string;
  walletId?: string;
  keyId?: string;
  address: string;
}

export interface CustomTransactionData {
  service?: string;
  giftCardName?: string;
  changelly?: string;
  oneInch?: string;
  shapeShift?: string;
  toWalletName?: any;
}

export interface TransactionOptions {
  wallet: Wallet;
  invoice?: Invoice;
  recipient: Recipient;
  amount: number;
  context?: 'multisend' | 'paypro' | 'selectInputs';
  currency?: string;
  toAddress?: string;
  network?: string;
  feeLevel?: string;
  feePerKb?: number;
  dryRun?: boolean;
  description?: string;
  message?: string;
  customData?: CustomTransactionData;
  payProUrl?: string;
  // btc
  enableRBF?: boolean;
  replaceTxByFee?: boolean;
  // eth
  gasPrice?: number;
  from?: string;
  nonce?: number;
  gasLimit?: number;
  data?: any;
  tokenAddress?: string;
  isTokenSwap?: boolean;
  multisigContractAddress?: string;
  // xrp
  destinationTag?: string;
  invoiceID?: string;
  useUnconfirmedFunds?: boolean;
}

export interface TransactionProposal {
  coin: string;
  chain: string;
  amount: any;
  from: string;
  nonce?: number;
  enableRBF?: boolean;
  replaceTxByFee?: boolean;
  toAddress: any;
  outputs: Array<{
    toAddress: any;
    amount: any;
    message?: string;
    data?: string;
    gasLimit?: number;
  }>;
  inputs: any;
  fee: any;
  message: string;
  customData?: CustomTransactionData;
  payProUrl: any;
  excludeUnconfirmedUtxos: boolean;
  feePerKb: number;
  feeLevel: string;
  dryRun: boolean;
  tokenAddress?: string;
  destinationTag?: string;
  invoiceID?: string;
  multisigGnosisContractAddress?: string;
  multisigContractAddress?: string;
  instantAcceptanceEscrow?: number;
  isTokenSwap?: boolean;
}

export interface ProposalErrorHandlerProps {
  err: Error;
  getState?: () => RootState;
  tx?: TransactionOptions;
  txp?: Partial<TransactionProposal>;
}

// UI details
export interface TxDetailsAmount {
  cryptoAmount: string;
  fiatAmount: string;
}

export interface TxDetailsFee {
  feeLevel: string;
  cryptoAmount: string;
  fiatAmount: string;
  percentageOfTotalAmount: string;
}

export interface TxDetailsSendingTo {
  recipientType?: string | undefined;
  recipientName?: string;
  recipientAddress?: string;
  img: string | ((props?: any) => ReactElement);
}

export interface TxDetailsSendingFrom {
  walletName: string;
  img: string | ((props?: any) => ReactElement);
}

export interface TxDetails {
  currency: string;
  sendingTo: TxDetailsSendingTo;
  fee: TxDetailsFee;
  networkCost?: TxDetailsAmount;
  // eth
  gasPrice?: number;
  gasLimit?: number;
  //
  sendingFrom: TxDetailsSendingFrom;
  subTotal: TxDetailsAmount;
  total: TxDetailsAmount;
}

export interface InvoiceCreationParams {
  invoiceType: string;
  amount: number;
  cardConfig?: CardConfig;
}
