import API from 'bitcore-wallet-client/ts_build';
import {ReactElement} from 'react';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {RootState} from '../index';
import {Invoice} from '../shop/shop.models';
import {Network} from '../../constants';
import {FeeLevels} from './effects/fee/fee';

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
  totalBalanceLastDay: number;
  isPrivKeyEncrypted?: boolean;
  keyName?: string;
  hideKeyBalance: boolean;
}

export interface Wallet extends WalletObj, API {}

export interface CryptoBalance {
  crypto: string;
  cryptoLocked: string;
  cryptoConfirmedLocked: string;
  cryptoSpendable: string;
  cryptoPending: string;
  sat: number;
  satAvailable: number;
  satLocked: number;
  satConfirmedLocked: number;
  satConfirmed: number;
  satConfirmedAvailable: number;
  satSpendable: number;
  satPending: number;
}

export interface FiatBalance {
  fiat: number;
  fiatLastDay: number;
  fiatLocked: number;
  fiatConfirmedLocked: number;
  fiatSpendable: number;
  fiatPending: number;
}
export interface WalletBalance extends CryptoBalance, FiatBalance {}

export interface WalletStatus {
  balance: CryptoBalance;
  pendingTxps: TransactionProposal[];
}
export interface WalletObj {
  id: string;
  keyId: string;
  currencyName: string;
  currencyAbbreviation: string;
  m: number;
  n: number;
  balance: CryptoBalance;
  pendingTxps: TransactionProposal[];
  tokens?: string[];
  walletName?: string;
  preferences?: {
    tokenAddresses?: [];
  };
  img: string | ((props?: any) => ReactElement);
  receiveAddress?: string;
  isRefreshing?: boolean;
  transactionHistory?: {
    transactions: any[];
    loadMore: boolean;
    hasConfirmingTxs: boolean;
  };
  hideWallet?: boolean;
  hideBalance?: boolean;
  network: Network;
}

export interface PriceHistory {
  coin: string;
  priceDisplay: Array<number>;
  percentChange: string;
  currencyPair: string;
  prices: Array<{price: number; time: string}>;
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
  seedType?: string;
  password?: string;
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
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

export type RatesByDateRange = {
  [key in DateRanges]: Rate[];
};

export enum DateRanges {
  Day = 1,
  Week = 7,
  Month = 30,
}

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
  status: string;
}
export interface Status {
  balance: Balance;
  pendingTxps: TransactionProposal[];
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
  amount?: number;
}

export interface CustomTransactionData {
  service?: string;
  giftCardName?: string;
  changelly?: string;
  oneInch?: string;
  shapeShift?: string;
  toWalletName?: any;
}

export type TransactionOptionsContext =
  | 'multisend'
  | 'paypro'
  | 'selectInputs'
  | 'fromReplaceByFee'
  | 'speedupBtcReceive'
  | 'speedupEth';

export interface TransactionOptions {
  wallet: Wallet;
  invoice?: Invoice;
  recipient: Recipient;
  amount: number;
  context?: TransactionOptionsContext;
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
  sendMax?: boolean;
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
  // fromReplaceByFee
  fee?: number;
  // selectInputs
  inputs?: Utxo[];
  // multisend
  recipientList?: Recipient[];
}

export interface Action {
  comment: string;
  copayerId: string;
  copayerName: string;
  createdOn: number;
  type: number;
}
export interface TransactionProposal {
  action: string;
  actions: Action[];
  addressTo: string;
  coin: string;
  chain: string;
  amount: number;
  amountStr: string;
  amountValueStr: string;
  amountUnitStr: string;
  size: number;
  feeStr: string;
  fees: number;
  feeRate: string;
  from: string;
  copayerId: string;
  walletId: string;
  nonce?: number;
  enableRBF?: boolean;
  replaceTxByFee?: boolean;
  toAddress: string;
  outputs: Array<{
    amount: number;
    address?: string;
    addressToShow?: string;
    toAddress?: string;
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
  id: string;
  gasLimit?: number;
  gasPrice?: number;
  status: string;
  sendMaxInfo?: SendMaxInfo;
  createdOn: number;
  pendingForUs: boolean;
  statusForUs: string;
  deleteLockTime: number;
  canBeRemoved: boolean;
  recipientCount: number;
  hasMultiplesOutputs: boolean;
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

export interface FeeOptions {
  urgent: string;
  priority: string;
  normal: string;
  economy: string;
  superEconomy: string;
  custom: string;
}

export interface TxDetailsSendingTo {
  recipientType?: string | undefined;
  recipientName?: string;
  recipientAddress?: string;
  img: string | ((props?: any) => ReactElement);
  recipientFullAddress?: string;
  recipientAmountStr?: string;
  currencyAbbreviation?: string;
  recipientAltAmountStr?: string;
  recipientCoin?: string;
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
  nonce?: number;
  //
  sendingFrom: TxDetailsSendingFrom;
  subTotal: TxDetailsAmount;
  total: TxDetailsAmount;
  // xrp
  destinationTag?: string;
}

export interface SendMaxInfo {
  amount: number;
  amountAboveMaxSize: number;
  amountBelowFee: number;
  fee: number;
  inputs: [any];
  size: number;
  utxosAboveMaxSize: number;
  utxosBelowFee: number;
}

export interface CacheFeeLevel {
  currency: 'eth' | 'btc';
  feeLevel: FeeLevels;
}

export interface BulkStatus {
  status: Status;
  success: boolean;
  walletId: string;
  tokenAddress?: string;
}

export interface Utxo {
  address: string;
  amount: number;
  confirmations: number;
  locked: boolean;
  path: string;
  publicKeys: Array<string>;
  satoshis: number;
  scriptPubKey: string;
  spent: boolean;
  txid: string;
  vout: number;
  checked?: boolean;
}
