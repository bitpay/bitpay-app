import {InitialUserData} from '../../api/user/user.types';
import {Network} from '../../constants';
import {
  Card,
  PagedTransactionData,
  ReferredUsersType,
  TopUp,
  Transaction,
} from './card.models';
import {
  ActivateCardStatus,
  ConfirmPinChangeStatus,
  FetchCardsStatus,
  FetchOverviewStatus,
  FetchPinChangeRequestInfoStatus,
  FetchSettledTransactionsStatus,
  FetchVirtualCardImageUrlsStatus,
  referredUsersStatus,
  UpdateCardLockStatus,
  UpdateCardNameStatus,
} from './card.reducer';
import {
  CardActionType,
  CardActionTypes,
  VirtualDesignCurrency,
} from './card.types';

export const successInitializeStore = (
  network: Network,
  data: InitialUserData,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_INITIALIZE_STORE,
  payload: {
    network,
    cards: data.cards || [],
    balances: data.cardBalances || [],
  },
});

export const successFetchCards = (
  network: Network,
  cards: Card[],
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_CARDS,
  payload: {network, cards},
});

export const failedFetchCards = (): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_CARDS,
});

export const updateFetchCardsStatus = (
  status: FetchCardsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS,
  payload: status,
});

export const virtualDesignCurrencyUpdated = (
  currency: VirtualDesignCurrency,
): CardActionType => ({
  type: CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED,
  payload: currency,
});

export const successFetchOverview = ({
  id,
  balance,
  settledTransactions,
  pendingTransactions,
  topUpHistory,
}: {
  id: string;
  balance: number;
  settledTransactions: PagedTransactionData;
  pendingTransactions: Transaction[];
  topUpHistory: TopUp[];
}): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_OVERVIEW,
  payload: {
    id,
    balance,
    settledTransactions,
    pendingTransactions,
    topUpHistory,
  },
});

export const failedFetchOverview = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_OVERVIEW,
  payload: {id},
});

export const updateFetchOverviewStatus = (
  id: string,
  status: FetchOverviewStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS,
  payload: {id, status},
});

export const successFetchSettledTransactions = (
  id: string,
  transactions: PagedTransactionData,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS,
  payload: {id, transactions},
});

export const failedFetchSettledTransactions = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS,
  payload: {id},
});

export const updateFetchSettledTransactionsStatus = (
  id: string,
  status: FetchSettledTransactionsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS,
  payload: {id, status},
});

export const successFetchVirtualImageUrls = (
  payload: {id: string; virtualCardImage: string}[],
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS,
  payload,
});

export const failedFetchVirtualImageUrls = (): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS,
});

export const updateFetchVirtualImageUrlsStatus = (
  status: FetchVirtualCardImageUrlsStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS,
  payload: status,
});

export const successUpdateCardLock = (
  network: Network,
  id: string,
  locked: boolean,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_UPDATE_CARD_LOCK,
  payload: {network, id, locked},
});

export const failedUpdateCardLock = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_UPDATE_CARD_LOCK,
  payload: {id},
});

export const updateUpdateCardLockStatus = (
  id: string,
  status: UpdateCardLockStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_UPDATE_CARD_LOCK_STATUS,
  payload: {id, status},
});

export const successUpdateCardName = (
  network: Network,
  id: string,
  nickname: string,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_UPDATE_CARD_NAME,
  payload: {network, id, nickname},
});

export const failedUpdateCardName = (id: string): CardActionType => ({
  type: CardActionTypes.FAILED_UPDATE_CARD_NAME,
  payload: {id},
});

export const updateUpdateCardNameStatus = (
  id: string,
  status: UpdateCardNameStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_UPDATE_CARD_NAME_STATUS,
  payload: {id, status},
});

export const successFetchReferralCode = (
  id: string,
  code: string,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_REFERRAL_CODE,
  payload: {id, code},
});

export const updateFetchReferralCodeStatus = (
  id: string,
  status: referredUsersStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_REFERRAL_CODE_STATUS,
  payload: {id, status},
});

export const successFetchReferredUsers = (
  id: string,
  referredUsers: ReferredUsersType[] | 'loading',
) => ({
  type: CardActionTypes.SUCCESS_FETCH_REFERRED_USERS,
  payload: {id, referredUsers},
});

export const updateFetchReferredUsersStatus = (
  id: string,
  status: referredUsersStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_REFERRED_USERS_STATUS,
  payload: {id, status},
});

export const successActivateCard = (): CardActionType => ({
  type: CardActionTypes.SUCCESS_ACTIVATE_CARD,
  payload: undefined,
});

export const failedActivateCard = (error?: string): CardActionType => ({
  type: CardActionTypes.FAILED_ACTIVATE_CARD,
  payload: error,
});

export const updateActivateCardStatus = (
  status: ActivateCardStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_ACTIVATE_CARD_STATUS,
  payload: status,
});

export const successFetchPinChangeRequestInfo = (
  id: string,
  pinChangeRequestInfo: string,
): CardActionType => ({
  type: CardActionTypes.SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO,
  payload: {id, pinChangeRequestInfo},
});

export const failedFetchPinChangeRequestInfo = (
  id: string,
  error: string,
): CardActionType => ({
  type: CardActionTypes.FAILED_FETCH_PIN_CHANGE_REQUEST_INFO,
  payload: {id, error},
});

export const updateFetchPinChangeRequestInfoStatus = (
  id: string,
  status: FetchPinChangeRequestInfoStatus,
): CardActionType => ({
  type: CardActionTypes.UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS,
  payload: {id, status},
});

export const resetPinChangeRequestInfo = (id: string): CardActionType => ({
  type: CardActionTypes.RESET_PIN_CHANGE_REQUEST_INFO,
  payload: {id},
});

export const confirmPinChangeSuccess = (id: string): CardActionType => ({
  type: CardActionTypes.CONFIRM_PIN_CHANGE_SUCCESS,
  payload: {id},
});

export const confirmPinChangeError = (
  id: string,
  error: string,
): CardActionType => ({
  type: CardActionTypes.CONFIRM_PIN_CHANGE_FAILED,
  payload: {id, error},
});

export const confirmPinChangeStatusUpdated = (
  id: string,
  status: ConfirmPinChangeStatus,
): CardActionType => ({
  type: CardActionTypes.CONFIRM_PIN_CHANGE_STATUS_UPDATED,
  payload: {id, status},
});

export const isJoinedWaitlist = (
  isJoinedWaitlist: boolean,
): CardActionType => ({
  type: CardActionTypes.IS_JOINED_WAITLIST,
  payload: {isJoinedWaitlist},
});
