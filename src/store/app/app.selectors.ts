import {ContentCard} from '@braze/react-native-sdk';
import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {
  isCardOffer,
  isDoMore,
  isMarketingCarousel,
  isShopWithCrypto,
  sortNewestFirst,
} from '../../utils/braze';

export const selectBrazeContentCards: AppSelector<ContentCard[]> = ({APP}) =>
  APP.brazeContentCards;

export const selectDismissedMarketingCardIds: AppSelector<string[]> = ({APP}) =>
  APP.dismissedMarketingCardIds;

export const selectBrazeShopWithCrypto = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isShopWithCrypto).sort(sortNewestFirst),
);

export const selectBrazeDoMore = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isDoMore),
);

export const selectBrazeCardOffers = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isCardOffer),
);

export const selectBrazeMarketingCarousel = createSelector(
  [selectBrazeContentCards, selectDismissedMarketingCardIds],
  (contentCards, dismissedIds) =>
    contentCards
      .filter(
        card =>
          isMarketingCarousel(card) &&
          (!card.id || !dismissedIds.includes(card.id)),
      )
      .sort(sortNewestFirst),
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
