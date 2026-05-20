import i18n from 'i18next';
import {logManager} from './LogManager';

export type BaseOnGoingProcessMessages =
  | 'GENERAL_AWAITING'
  | 'CREATING_KEY'
  | 'LOGGING_IN'
  | 'LOGGING_OUT'
  | 'PAIRING'
  | 'CREATING_ACCOUNT'
  | 'UPDATING_ACCOUNT'
  | 'IMPORTING'
  | 'IMPORT_SCANNING_FUNDS'
  | 'DELETING_KEY'
  | 'ADDING_WALLET'
  | 'ADDING_ACCOUNT'
  | 'ADDING_EVM_CHAINS'
  | 'ADDING_SPL_CHAINS'
  | 'LOADING'
  | 'FETCHING_PAYMENT_OPTIONS'
  | 'FETCHING_PAYMENT_INFO'
  | 'JOIN_WALLET'
  | 'SENDING_PAYMENT'
  | 'ACCEPTING_PAYMENT'
  | 'GENERATING_ADDRESS'
  | 'GENERATING_GIFT_CARD'
  | 'SYNCING_WALLETS'
  | 'REJECTING_CALL_REQUEST'
  | 'SAVING_LAYOUT'
  | 'SAVING_ADDRESSES'
  | 'EXCHANGE_GETTING_DATA'
  | 'CALCULATING_FEE'
  | 'CONNECTING_COINBASE'
  | 'FETCHING_COINBASE_DATA'
  | 'UPDATING_TXP'
  | 'CREATING_TXP'
  | 'SENDING_EMAIL'
  | 'REDIRECTING'
  | 'REMOVING_BILL'
  | 'BROADCASTING_TXP'
  | 'SWEEPING_WALLET'
  | 'SCANNING_FUNDS'
  | 'SCANNING_FUNDS_WITH_PASSPHRASE'
  | 'CREATING_PASSKEY'
  | 'DELETING_PASSKEY'
  | 'WAITING_FOR_MAX_AMOUNT';

export type ImportProgressMessages =
  | 'keyConfig.count'
  | 'keyConfig.start'
  | 'keyConfig.keyCreated'
  | 'keyConfig.noCopayersFound'
  | 'chainPermutations.count'
  | 'chainPermutations.getKey'
  | 'findingCopayers'
  | 'foundCopayers'
  | 'foundCopayers.count'
  | 'creatingCredentials'
  | 'gettingStatuses'
  | 'gatheringWalletsInfos'
  | 'walletInfo.gatheringTokens'
  | 'walletInfo.gatheringTokens.error'
  | 'walletInfo.importingToken'
  | 'walletInfo.gatheringMultisig'
  | 'walletInfo.multisig.creatingCredentials'
  | 'walletInfo.multisig.importingToken';

export type OnGoingProcessMessages =
  | BaseOnGoingProcessMessages
  | ImportProgressMessages;

export interface OngoingProcessState {
  isVisible: boolean;
  message: string | undefined;
}

export type OngoingProcessObjectData = {
  chain?: string;
  tokenName?: string;
  walletName?: string;
  count?: number;
  iteration?: number;
};

export type OngoingProcessData = number | OngoingProcessObjectData | undefined;

const isNumberData = (data: OngoingProcessData): data is number =>
  typeof data === 'number';

const getChain = (data?: OngoingProcessData): string | undefined =>
  typeof data === 'object' && data !== null ? data.chain : undefined;

const getTokenName = (data?: OngoingProcessData): string | undefined =>
  typeof data === 'object' && data !== null ? data.tokenName : undefined;

const getWalletName = (data?: OngoingProcessData): string | undefined =>
  typeof data === 'object' && data !== null ? data.walletName : undefined;

const getIteration = (data?: OngoingProcessData): number =>
  typeof data === 'object' && data !== null ? data.iteration ?? 1 : 1;

const getCount = (data?: OngoingProcessData): number =>
  typeof data === 'object' && data !== null
    ? data.count ?? 0
    : isNumberData(data)
    ? data
    : 0;

const translations: Record<
  OnGoingProcessMessages,
  (data?: OngoingProcessData) => string
> = {
  GENERAL_AWAITING: () =>
    i18n.t("Just a second, we're setting a few things up"),
  CREATING_KEY: () =>
    i18n.t("Creating Key... just a second, we're setting a few things up"),
  LOGGING_IN: () => i18n.t('Logging In'),
  LOGGING_OUT: () => i18n.t('Logging Out'),
  PAIRING: () => i18n.t('Pairing'),
  CREATING_ACCOUNT: () => i18n.t('Creating Account'),
  UPDATING_ACCOUNT: () => i18n.t('Updating Account'),
  IMPORTING: () => i18n.t('Importing... this process may take a few minutes'),
  IMPORT_SCANNING_FUNDS: () =>
    i18n.t('Scanning Funds... this process may take a few minutes'),
  DELETING_KEY: () => i18n.t('Deleting Key'),
  ADDING_WALLET: () => i18n.t('Adding Wallet'),
  ADDING_ACCOUNT: () => i18n.t('Adding Account-Based Wallet'),
  ADDING_EVM_CHAINS: () => i18n.t('Adding EVM Chains'),
  ADDING_SPL_CHAINS: () => i18n.t('Adding Solana Account'),
  LOADING: () => i18n.t('Loading'),
  FETCHING_PAYMENT_OPTIONS: () => i18n.t('Fetching payment options...'),
  FETCHING_PAYMENT_INFO: () => i18n.t('Fetching payment information...'),
  JOIN_WALLET: () => i18n.t('Joining Wallet'),
  SENDING_PAYMENT: () => i18n.t('Sending Payment'),
  ACCEPTING_PAYMENT: () => i18n.t('Accepting Payment'),
  GENERATING_ADDRESS: () => i18n.t('Generating Address'),
  GENERATING_GIFT_CARD: () => i18n.t('Generating Gift Card'),
  SYNCING_WALLETS: () => i18n.t('Syncing Wallets...'),
  REJECTING_CALL_REQUEST: () => i18n.t('Rejecting Call Request'),
  SAVING_LAYOUT: () => i18n.t('Saving Layout'),
  SAVING_ADDRESSES: () => i18n.t('Saving Addresses'),
  EXCHANGE_GETTING_DATA: () => i18n.t('Getting data from the exchange...'),
  CALCULATING_FEE: () => i18n.t('Calculating Fee'),
  CONNECTING_COINBASE: () => i18n.t('Connecting with Coinbase...'),
  FETCHING_COINBASE_DATA: () => i18n.t('Fetching data from Coinbase...'),
  UPDATING_TXP: () => i18n.t('Updating Transaction'),
  CREATING_TXP: () => i18n.t('Creating Transaction'),
  SENDING_EMAIL: () => i18n.t('Sending Email'),
  REDIRECTING: () => i18n.t('Redirecting'),
  REMOVING_BILL: () => i18n.t('Removing Bill'),
  BROADCASTING_TXP: () => i18n.t('Broadcasting transaction...'),
  SWEEPING_WALLET: () => i18n.t('Sweeping Wallet...'),
  SCANNING_FUNDS: () => i18n.t('Scanning Funds...'),
  SCANNING_FUNDS_WITH_PASSPHRASE: () =>
    i18n.t('Scanning Funds... this process may take a few minutes'),
  CREATING_PASSKEY: () => i18n.t('Creating Passkey...'),
  DELETING_PASSKEY: () => i18n.t('Deleting Passkey...'),
  WAITING_FOR_MAX_AMOUNT: () => i18n.t('Calculating maximum amount...'),
  'keyConfig.count': data =>
    i18n.t('Checking {{count}} key configurations...', {
      count: isNumberData(data) ? data : 0,
    }),
  'keyConfig.start': data =>
    i18n.t('Checking key configuration {{index}}...', {
      index: isNumberData(data) ? data + 1 : 1,
    }),
  'keyConfig.keyCreated': () => i18n.t('Key created, searching for wallets...'),
  'keyConfig.noCopayersFound': () =>
    i18n.t('No wallets found for this configuration, trying next...'),
  'chainPermutations.count': data =>
    i18n.t('Checking {{count}} chain permutations...', {
      count: isNumberData(data) ? data : 0,
    }),
  'chainPermutations.getKey': data =>
    i18n.t('Deriving key for chain permutation {{index}}...', {
      index: isNumberData(data) ? data + 1 : 1,
    }),
  findingCopayers: data =>
    getIteration(data) > 1
      ? i18n.t('Checking for additional wallets...')
      : i18n.t('Searching for your wallets...'),
  foundCopayers: data => {
    const iteration = getIteration(data);
    const count = getCount(data);
    if (iteration > 1 && count === 0) {
      return i18n.t('No more wallets found...');
    }
    if (iteration > 1) {
      return i18n.t('{{count}} more wallets found! Loading details...', {
        count,
      });
    }
    if (iteration === 1 && count === 0) {
      return i18n.t('No wallets found...');
    }
    return count === 1
      ? i18n.t('Found 1 wallet! Loading details...')
      : i18n.t('Found {{count}} wallets! Loading details...', {count});
  },
  'foundCopayers.count': data => {
    const count = getCount(data);
    return count === 1
      ? i18n.t('Found 1 wallet! Loading details...')
      : i18n.t('Found {{count}} wallets! Loading details...', {count});
  },
  creatingCredentials: () => i18n.t('Almost there...'),
  gettingStatuses: () => i18n.t('Getting wallet info...'),
  gatheringWalletsInfos: data => {
    const count = getCount(data);
    return count === 1
      ? i18n.t('Loading 1 wallet...')
      : i18n.t('Loading {{count}} wallets...', {count});
  },
  'walletInfo.gatheringTokens': data => {
    const chain = getChain(data);
    return i18n.t('Loading {{chain}} tokens...', {chain});
  },
  'walletInfo.gatheringTokens.error': () =>
    i18n.t('Some tokens could not be loaded, continuing...'),
  'walletInfo.importingToken': data => {
    const tokenName = getTokenName(data);
    return i18n.t('Adding {{tokenName}}...', {tokenName});
  },
  'walletInfo.gatheringMultisig': data => {
    const chain = getChain(data);
    return i18n.t('Loading {{chain}} shared wallets...', {chain});
  },
  'walletInfo.multisig.creatingCredentials': data => {
    const walletName = getWalletName(data);
    return i18n.t('Setting up {{walletName}}...', {walletName});
  },

  'walletInfo.multisig.importingToken': data => {
    const tokenName = getTokenName(data);
    return i18n.t('Adding {{tokenName}}...', {tokenName});
  },
};

export const importProgressEvents: ImportProgressMessages[] = [
  'keyConfig.count',
  'keyConfig.start',
  'keyConfig.keyCreated',
  'keyConfig.noCopayersFound',
  'chainPermutations.count',
  'chainPermutations.getKey',
  'findingCopayers',
  'foundCopayers',
  'foundCopayers.count',
  'creatingCredentials',
  'gettingStatuses',
  'gatheringWalletsInfos',
  'walletInfo.gatheringTokens',
  'walletInfo.gatheringTokens.error',
  'walletInfo.importingToken',
  'walletInfo.gatheringMultisig',
  'walletInfo.multisig.creatingCredentials',
  'walletInfo.multisig.importingToken',
];

const LONG_RUNNING_PROCESSES: OnGoingProcessMessages[] = [
  'IMPORTING',
  'IMPORT_SCANNING_FUNDS',
  'SCANNING_FUNDS_WITH_PASSPHRASE',
  'CREATING_KEY',
  'SYNCING_WALLETS',
  ...importProgressEvents,
];

class OngoingProcessManager {
  private static instance: OngoingProcessManager;
  private listeners: Set<(data: OngoingProcessState) => void> = new Set();
  private state: OngoingProcessState = {
    isVisible: false,
    message: undefined,
  };
  private timeoutRef: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): OngoingProcessManager {
    if (!OngoingProcessManager.instance) {
      OngoingProcessManager.instance = new OngoingProcessManager();
    }
    return OngoingProcessManager.instance;
  }

  getState(): OngoingProcessState {
    return {
      isVisible: this.state.isVisible,
      message: this.state.message,
    };
  }

  show(key: OnGoingProcessMessages, data?: OngoingProcessData): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }

    const translatedMessage = translations[key]?.(data) ?? i18n.t('Loading');

    this.state = {
      isVisible: true,
      message: translatedMessage,
    };

    this.notifyListeners();

    if (!LONG_RUNNING_PROCESSES.includes(key)) {
      this.timeoutRef = setTimeout(() => {
        this.hide();
      }, 60000);
    }
  }

  hide(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }

    this.state = {
      isVisible: false,
      message: undefined,
    };

    this.notifyListeners();
  }

  subscribe(listener: (data: OngoingProcessState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const data = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          '[OngoingProcessManager] Error notifying listener:',
          errStr,
        );
      }
    });
  }

  clear(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
    this.state = {
      isVisible: false,
      message: undefined,
    };
    this.listeners.clear();
  }
}

export const ongoingProcessManager = OngoingProcessManager.getInstance();
