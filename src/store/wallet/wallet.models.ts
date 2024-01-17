import API from 'bitcore-wallet-client/ts_build';
import {ReactElement} from 'react';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {RootState} from '../index';
import {Invoice} from '../shop/shop.models';
import {Network} from '../../constants';
import {FeeLevels} from './effects/fee/fee';

/**
 * Currently supported hardware wallet sources.
 */
export type SupportedHardwareSource = 'ledger'; // only ledger supported currently

export interface KeyMethods {
  _checkCoin?: Function;
  _checkNetwork?: Function;
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
  properties: KeyProperties | undefined;
  methods: KeyMethods | undefined;
  backupComplete?: boolean;
  show?: boolean;
  totalBalance: number;
  totalBalanceLastDay: number;
  isPrivKeyEncrypted?: boolean | undefined;
  keyName?: string;
  hideKeyBalance: boolean;
  isReadOnly: boolean;

  // CLIENT ONLY
  hardwareSource?: SupportedHardwareSource;
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
  chain: string;
  currencyName: string;
  currencyAbbreviation: string;
  m: number;
  n: number;
  balance: CryptoBalance;
  pendingTxps: TransactionProposal[];
  tokenAddress?: string;
  tokens?: string[];
  walletName?: string;
  preferences?: {
    tokenAddresses?: [];
    maticTokenAddresses?: [];
  };
  img: string | ((props?: any) => ReactElement);
  badgeImg?: string | ((props?: any) => ReactElement);
  receiveAddress?: string;
  isRefreshing?: boolean;
  isScanning?: boolean;
  transactionHistory?: {
    transactions: any[];
    loadMore: boolean;
    hasConfirmingTxs: boolean;
  };
  hideWallet?: boolean;
  hideBalance?: boolean;
  network: Network;
  isHardwareWallet?: boolean;
  hardwareData?: {
    /**
     * Each wallet imported from a hardware device maps to a specific account path for the wallet's xPubKey
     */
    accountPath?: string;
  };
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
  includeTestnetWallets?: boolean;
  includeLegacyWallets?: boolean;
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
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
  singleAddress: boolean; // TODO add to bwc credentials model
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
}

export interface Recipient {
  type?: string;
  name?: string;
  email?: string;
  walletId?: string;
  keyId?: string;
  address: string;
  amount?: number;
  destinationTag?: number;
  chain?: string;
  tokenAddress?: string;
}

export interface CustomTransactionData {
  service?: string;
  recipientEmail?: string;
  giftCardName?: string;
  changelly?: string;
  oneInch?: string;
  shapeShift?: string;
  toWalletName?: any;
  billPayMerchantIds?: string[];
}

export type TransactionOptionsContext =
  | 'multisend'
  | 'paypro'
  | 'selectInputs'
  | 'fromReplaceByFee'
  | 'speedupBtcReceive'
  | 'speedupEth'
  | 'walletConnect';

export interface TransactionOptions {
  wallet: Wallet;
  invoice?: Invoice;
  recipient: Recipient;
  amount: number;
  context?: TransactionOptionsContext;
  currency?: string;
  chain?: string;
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
  payProDetails?: any;
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
  destinationTag?: number;
  invoiceID?: string;
  useUnconfirmedFunds?: boolean;
  // fromReplaceByFee
  fee?: number;
  outputs?: Utxo[];
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
    amount: number | string; // Support BN
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
  destinationTag?: number;
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
  requiredSignatures: number;
  requiredRejections: number;
  raw?: string;
  txid?: string;
  inputPaths: Array<string | null>;
  changeAddress: {
    path: string;
  };
  network: Network;
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
  percentageOfTotalAmountStr: string;
  percentageOfTotalAmount: number;
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
  recipientEmail?: string;
  img?: string | ((props?: any) => ReactElement);
  recipientFullAddress?: string;
  recipientAmountStr?: string;
  currencyAbbreviation?: string;
  recipientAltAmountStr?: string;
  recipientCoin?: string;
  recipientChain?: string;
  recipientTokenAddress?: string;
}

export interface TxDetailsSendingFrom {
  walletName: string;
  img: string | ((props?: any) => ReactElement);
  badgeImg?: string | ((props: any) => ReactElement);
}

export interface TxDetails {
  currency: string;
  sendingTo: TxDetailsSendingTo;
  fee?: TxDetailsFee;
  networkCost?: TxDetailsAmount;
  context?: TransactionOptionsContext;
  // eth
  gasPrice?: number;
  gasLimit?: number;
  nonce?: number;
  //
  sendingFrom: TxDetailsSendingFrom;
  subTotal: TxDetailsAmount;
  total: TxDetailsAmount;
  rateStr?: string;
  // xrp
  destinationTag?: number;
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
  currency: 'eth' | 'btc' | 'matic';
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

/**
 * Partial interface for the bitcore-lib Script type representing a
 * bitcoin transaction script.
 */
interface BitcoreScriptLike {
  /**
   * Returns the Script data in a Buffer.
   * @returns Buffer containing the Script data.
   */
  toBuffer: () => Buffer;
}

/**
 * Partial interface representing a generic bitcore-lib TransactionInput class.
 */
interface BitcoreTransactionInputLike {
  prevTxId: Buffer;
  outputIndex: number;
  sequenceNumber: number;
}

/**
 * Partial interface representing a generic bitcore-lib TransactionOutput class.
 */
interface BitcoreTransactionOutputLike {
  satoshis: number;
  script: BitcoreScriptLike;
}

/**
 * Partial interface representing a generic bitcore-lib UTXO Transaction class.
 */
export interface BitcoreUtxoTransactionLike {
  inputs: Array<BitcoreTransactionInputLike>;
  outputs: Array<BitcoreTransactionOutputLike>;
  _changeIndex: number;
}

/**
 * Partial interface representing a generic bitcore-lib EVM Transaction class.
 */
export interface BitcoreEvmTransactionLike {
  uncheckedSerialize: () => string;
}
