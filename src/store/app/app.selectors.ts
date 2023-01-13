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

export const selectAnnouncementsAccepted: AppSelector<boolean> = ({APP}) =>
  APP.announcementsAccepted;

export const selectSettingsNotificationState = createSelector(
  [
    selectNotificationsAccepted,
    selectConfirmedTxAccepted,
    selectAnnouncementsAccepted,
  ],
  (notificationsAccepted, confirmedTxAccepted, announcementsAccepted) => {
    return {
      pushNotifications: notificationsAccepted,
      confirmedTx: confirmedTxAccepted,
      announcements: announcementsAccepted,
    };
  },
);
