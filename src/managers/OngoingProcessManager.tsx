import i18n from 'i18next';

export type OnGoingProcessMessages =
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

export interface OngoingProcessState {
  isVisible: boolean;
  message: string | undefined;
}

const translations: Record<OnGoingProcessMessages, () => string> = {
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
};

const LONG_RUNNING_PROCESSES: OnGoingProcessMessages[] = [
  'IMPORTING',
  'IMPORT_SCANNING_FUNDS',
  'SCANNING_FUNDS_WITH_PASSPHRASE',
  'CREATING_KEY',
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

  /**
   * Obtiene el estado actual
   */
  getState(): OngoingProcessState {
    return {
      isVisible: this.state.isVisible,
      message: this.state.message,
    };
  }

  show(key: OnGoingProcessMessages): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }

    const translatedMessage = translations[key]();
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
      } catch (error) {
        console.error(
          '[OngoingProcessManager] Error notifying listener:',
          error,
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
