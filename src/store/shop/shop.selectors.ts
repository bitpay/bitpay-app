import {createSelector} from 'reselect';
import {AppSelector} from '..';
import {getCardConfigFromApiConfigMap} from '../../lib/gift-cards/gift-card';
import {AvailableCardMap} from './shop.models';

export const selectAvailableCardMap: AppSelector<AvailableCardMap> = ({
  SHOP,
}) => {
  return SHOP.availableCardMap;
};

export const selectAvailableGiftCards = createSelector(
  [selectAvailableCardMap],
  availableCardMap => getCardConfigFromApiConfigMap(availableCardMap),
);
