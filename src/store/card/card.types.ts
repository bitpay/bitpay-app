import {Network} from '../../constants';
import {
  AddAppleWalletData,
  Card,
  PagedTransactionData,
  ReferredUsersType,
  TopUp,
  Transaction,
} from './card.models';
import {
  ActivateCardStatus,
  FetchCardsStatus,
  FetchOverviewStatus,
  FetchSettledTransactionsStatus,
  FetchVirtualCardImageUrlsStatus,
  UpdateCardNameStatus,
  UpdateCardLockStatus,
  referredUsersStatus,
  FetchPinChangeRequestInfoStatus,
  ConfirmPinChangeStatus,
} from './card.reducer';

export const TTL = {
  fetchOverview: 1000 * 10,
};

export type SupportedCurrencies =
  | 'BTC'
  | 'BCH'
  | 'ETH'
  | 'GUSD'
  | 'USDP'
  | 'BUSD'
  | 'USDC'
  | 'XRP'
  | 'DOGE'
  | 'DAI'
  | 'WBTC';

export type VirtualDesignCurrency = SupportedCurrencies | 'bitpay-b';

export enum CardActionTypes {
  SUCCESS_INITIALIZE_STORE = 'CARD/SUCCESS_INITIALIZE_STORE',
  SUCCESS_FETCH_CARDS = 'CARD/SUCCESS_FETCH_CARDS',
  FAILED_FETCH_CARDS = 'CARD/FAILED_FETCH_CARDS',
  UPDATE_FETCH_CARDS_STATUS = 'CARD/UPDATE_FETCH_CARDS_STATUS',
  VIRTUAL_DESIGN_CURRENCY_UPDATED = 'CARD/VIRTUAL_DESIGN_CURRENCY_UPDATED',
  SUCCESS_FETCH_OVERVIEW = 'CARD/SUCCESS_FETCH_OVERVIEW',
  FAILED_FETCH_OVERVIEW = 'CARD/FAILED_FETCH_OVERVIEW',
  UPDATE_FETCH_OVERVIEW_STATUS = 'CARD/UPDATE_FETCH_OVERVIEW_STATUS',
  SUCCESS_FETCH_SETTLED_TRANSACTIONS = 'CARD/SUCCESS_FETCH_SETTLED_TRANSACTIONS',
  FAILED_FETCH_SETTLED_TRANSACTIONS = 'CARD/FAILED_FETCH_SETTLED_TRANSACTIONS',
  UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS = 'CARD/UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS',
  SUCCESS_FETCH_VIRTUAL_IMAGE_URLS = 'CARD/SUCCESS_FETCH_VIRTUAL_IMAGE_URLS',
  FAILED_FETCH_VIRTUAL_IMAGE_URLS = 'CARD/FAILED_FETCH_VIRTUAL_IMAGE_URLS',
  UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS = 'CARD/UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS',
  SUCCESS_UPDATE_CARD_LOCK = 'CARD/SUCCESS_UPDATE_CARD_LOCK',
  FAILED_UPDATE_CARD_LOCK = 'CARD/FAILED_UPDATE_CARD_LOCK',
  UPDATE_UPDATE_CARD_LOCK_STATUS = 'CARD/UPDATE_UPDATE_CARD_LOCK_STATUS',
  SUCCESS_UPDATE_CARD_NAME = 'CARD/SUCCESS_UPDATE_CARD_NAME',
  FAILED_UPDATE_CARD_NAME = 'CARD/FAILED_UPDATE_CARD_NAME',
  UPDATE_UPDATE_CARD_NAME_STATUS = 'CARD/UPDATE_UPDATE_CARD_NAME_STATUS',
  SUCCESS_FETCH_REFERRAL_CODE = 'CARD/SUCCESS_FETCH_REFERRAL_CODE',
  UPDATE_FETCH_REFERRAL_CODE_STATUS = 'CARD/UPDATE_FETCH_REFERRAL_CODE_STATUS',
  SUCCESS_FETCH_REFERRED_USERS = 'CARD/SUCCESS_FETCH_REFERRED_USERS',
  UPDATE_FETCH_REFERRED_USERS_STATUS = 'CARD/UPDATE_FETCH_REFERRED_USERS_STATUS',
  SUCCESS_ACTIVATE_CARD = 'CARD/SUCCESS_ACTIVATE_CARD',
  FAILED_ACTIVATE_CARD = 'CARD/FAILED_ACTIVATE_CARD',
  UPDATE_ACTIVATE_CARD_STATUS = 'CARD/UPDATE_ACTIVATE_CARD_STATUS',
  START_ADD_TO_APPLE_WALLET = 'CARD/START_ADD_TO_APPLE_WALLET',
  SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO = 'CARD/SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO',
  FAILED_FETCH_PIN_CHANGE_REQUEST_INFO = 'CARD/FAILED_FETCH_PIN_CHANGE_REQUEST_INFO',
  UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS = 'CARD/UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS',
  RESET_PIN_CHANGE_REQUEST_INFO = 'CARD/RESET_PIN_CHANGE_REQUEST_INFO',
  CONFIRM_PIN_CHANGE_SUCCESS = 'CARD/CONFIRM_PIN_CHANGE_SUCCESS',
  CONFIRM_PIN_CHANGE_FAILED = 'CARD/CONFIRM_PIN_CHANGE_FAILED',
  CONFIRM_PIN_CHANGE_STATUS_UPDATED = 'CARD/CONFIRM_PIN_CHANGE_STATUS_UPDATED',
  IS_JOINED_WAITLIST = 'CARD/IS_JOINED_WAITLIST',
}

interface SuccessInitializeStore {
  type: CardActionTypes.SUCCESS_INITIALIZE_STORE;
  payload: {
    network: Network;
    cards: Card[];
    balances: {id: string; balance: number}[];
  };
}

interface SuccessFetchCards {
  type: CardActionTypes.SUCCESS_FETCH_CARDS;
  payload: {network: Network; cards: Card[]};
}

interface FailedFetchCards {
  type: CardActionTypes.FAILED_FETCH_CARDS;
}

interface UpdateFetchCardsStatus {
  type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS;
  payload: FetchCardsStatus;
}

interface VirtualDesignCurrencyUpdated {
  type: CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED;
  payload: VirtualDesignCurrency;
}

interface SuccessFetchOverview {
  type: CardActionTypes.SUCCESS_FETCH_OVERVIEW;
  payload: {
    id: string;
    balance: number;
    settledTransactions: PagedTransactionData;
    pendingTransactions: Transaction[];
    topUpHistory: TopUp[];
  };
}

interface FailedFetchOverview {
  type: CardActionTypes.FAILED_FETCH_OVERVIEW;
  payload: {id: string};
}

interface UpdateFetchOverviewStatus {
  type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS;
  payload: {id: string; status: FetchOverviewStatus};
}

interface SuccessFetchSettledTransactions {
  type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS;
  payload: {id: string; transactions: PagedTransactionData};
}

interface FailedFetchSettledTransactions {
  type: CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS;
  payload: {id: string};
}

interface UpdateFetchSettledTransactionsStatus {
  type: CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS;
  payload: {id: string; status: FetchSettledTransactionsStatus};
}

interface SuccessFetchVirtualImageUrls {
  type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS;
  payload: {id: string; virtualCardImage: string}[];
}

interface FailedFetchVirtualImageUrls {
  type: CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS;
}

interface UpdateFetchVirtualImageUrlsStatus {
  type: CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS;
  payload: FetchVirtualCardImageUrlsStatus;
}

interface SuccessUpdateCardLock {
  type: CardActionTypes.SUCCESS_UPDATE_CARD_LOCK;
  payload: {network: Network; id: string; locked: boolean};
}

interface FailedUpdateCardLock {
  type: CardActionTypes.FAILED_UPDATE_CARD_LOCK;
  payload: {id: string};
}

interface UpdateUpdateCardLockStatus {
  type: CardActionTypes.UPDATE_UPDATE_CARD_LOCK_STATUS;
  payload: {id: string; status: UpdateCardLockStatus};
}

interface SuccessUpdateCardName {
  type: CardActionTypes.SUCCESS_UPDATE_CARD_NAME;
  payload: {network: Network; id: string; nickname: string};
}

interface FailedUpdateCardName {
  type: CardActionTypes.FAILED_UPDATE_CARD_NAME;
  payload: {id: string};
}

interface UpdateUpdateCardNameStatus {
  type: CardActionTypes.UPDATE_UPDATE_CARD_NAME_STATUS;
  payload: {id: string; status: UpdateCardNameStatus};
}

interface SuccessFetchReferralCode {
  type: CardActionTypes.SUCCESS_FETCH_REFERRAL_CODE;
  payload: {id: string; code: string};
}

interface UpdateFetchReferralCodeStatus {
  type: CardActionTypes.UPDATE_FETCH_REFERRAL_CODE_STATUS;
  payload: {id: string; status: referredUsersStatus};
}

interface SuccessFetchReferredUsers {
  type: CardActionTypes.SUCCESS_FETCH_REFERRED_USERS;
  payload: {id: string; referredUsers: ReferredUsersType[]};
}

interface FailedFetchReferredUsers {
  type: CardActionTypes.UPDATE_FETCH_REFERRED_USERS_STATUS;
  payload: {id: string; status: referredUsersStatus};
}

interface SuccessActivateCard {
  type: CardActionTypes.SUCCESS_ACTIVATE_CARD;
  payload: undefined;
}

interface FailedActivateCard {
  type: CardActionTypes.FAILED_ACTIVATE_CARD;
  payload: string | undefined;
}

interface UpdateActivateCardStatus {
  type: CardActionTypes.UPDATE_ACTIVATE_CARD_STATUS;
  payload: ActivateCardStatus;
}

interface StartAddToAppleWallet {
  type: CardActionTypes.START_ADD_TO_APPLE_WALLET;
  payload: AddAppleWalletData;
}

interface SuccessFetchPinChangeRequestInfo {
  type: CardActionTypes.SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO;
  payload: {id: string; pinChangeRequestInfo: string};
}

interface FailedFetchPinChangeRequestInfo {
  type: CardActionTypes.FAILED_FETCH_PIN_CHANGE_REQUEST_INFO;
  payload: {id: string; error: string};
}

interface UpdateFetchPinChangeRequestInfoStatus {
  type: CardActionTypes.UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS;
  payload: {id: string; status: FetchPinChangeRequestInfoStatus};
}

interface ResetPinChangeRequestInfo {
  type: CardActionTypes.RESET_PIN_CHANGE_REQUEST_INFO;
  payload: {id: string};
}

interface ConfirmPinChangeSuccess {
  type: CardActionTypes.CONFIRM_PIN_CHANGE_SUCCESS;
  payload: {id: string};
}

interface ConfirmPinChangeFailed {
  type: CardActionTypes.CONFIRM_PIN_CHANGE_FAILED;
  payload: {id: string; error: string};
}

interface ConfirmPinChangeStatusUpdated {
  type: CardActionTypes.CONFIRM_PIN_CHANGE_STATUS_UPDATED;
  payload: {id: string; status: ConfirmPinChangeStatus};
}

interface IsJoinedWaitlist {
  type: CardActionTypes.IS_JOINED_WAITLIST;
  payload: {isJoinedWaitlist: boolean};
}

export type CardActionType =
  | SuccessInitializeStore
  | SuccessFetchCards
  | FailedFetchCards
  | UpdateFetchCardsStatus
  | VirtualDesignCurrencyUpdated
  | SuccessFetchOverview
  | FailedFetchOverview
  | UpdateFetchOverviewStatus
  | SuccessFetchSettledTransactions
  | FailedFetchSettledTransactions
  | UpdateFetchSettledTransactionsStatus
  | SuccessFetchVirtualImageUrls
  | FailedFetchVirtualImageUrls
  | UpdateFetchVirtualImageUrlsStatus
  | SuccessUpdateCardLock
  | FailedUpdateCardLock
  | UpdateUpdateCardLockStatus
  | SuccessUpdateCardName
  | FailedUpdateCardName
  | UpdateUpdateCardNameStatus
  | SuccessFetchReferralCode
  | UpdateFetchReferralCodeStatus
  | SuccessFetchReferredUsers
  | FailedFetchReferredUsers
  | SuccessActivateCard
  | FailedActivateCard
  | UpdateActivateCardStatus
  | StartAddToAppleWallet
  | SuccessFetchPinChangeRequestInfo
  | FailedFetchPinChangeRequestInfo
  | UpdateFetchPinChangeRequestInfoStatus
  | ResetPinChangeRequestInfo
  | ConfirmPinChangeSuccess
  | ConfirmPinChangeFailed
  | ConfirmPinChangeStatusUpdated
  | IsJoinedWaitlist;
