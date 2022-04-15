import {ContentCard} from 'react-native-appboy-sdk';
import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {isDoMore, isFeaturedMerchant, isQuickLink} from '../../utils/braze';

export const selectBrazeContentCards: AppSelector<ContentCard[]> = ({APP}) =>
  APP.brazeContentCards;

export const selectBrazeOffers = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isFeaturedMerchant),
);

export const selectBrazeAdvertisements = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isDoMore),
);

export const selectBrazeQuickLinks = createSelector(
  [selectBrazeContentCards],
  contentCards => contentCards.filter(isQuickLink),
);
