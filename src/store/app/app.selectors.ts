import {ContentCard} from 'react-native-appboy-sdk';
import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {isDoMore, isQuickLink, isShopWithCrypto} from '../../utils/braze';

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
