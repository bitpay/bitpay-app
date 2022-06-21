import {ContentCard} from 'react-native-appboy-sdk';
import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {
  isCardOffer,
  isDoMore,
  isQuickLink,
  isShopWithCrypto,
} from '../../utils/braze';

export const selectBrazeContentCards: AppSelector<ContentCard[]> = ({APP}) =>
  APP.brazeContentCards;

export const selectBrazeShopWithCrypto = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isShopWithCrypto),
);

export const selectBrazeDoMore = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isDoMore),
);

export const selectBrazeQuickLinks = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isQuickLink),
);

export const selectBrazeCardOffers = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isCardOffer),
);

export const selectNotificationsAccepted: AppSelector<boolean> = ({APP}) =>
  APP.notificationsAccepted;

export const selectConfirmedTxAccepted: AppSelector<boolean> = ({APP}) =>
  APP.confirmedTxAccepted;

export const selectProductsUpdatesAccepted: AppSelector<boolean> = ({APP}) =>
  APP.productsUpdatesAccepted;

export const selectOffersAndPromotionsAccepted: AppSelector<boolean> = ({
  APP,
}) => APP.offersAndPromotionsAccepted;

export const selectSettingsNotificationState = createSelector(
  [
    selectNotificationsAccepted,
    selectConfirmedTxAccepted,
    selectProductsUpdatesAccepted,
    selectOffersAndPromotionsAccepted,
  ],
  (
    notificationsAccepted,
    confirmedTxAccepted,
    productsUpdatesAccepted,
    offersAndPromotionsAccepted,
  ) => {
    return {
      pushNotifications: notificationsAccepted,
      confirmedTx: confirmedTxAccepted,
      productsUpdates: productsUpdatesAccepted,
      offersAndPromotions: offersAndPromotionsAccepted,
    };
  },
);
