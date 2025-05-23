import {AppSelector} from '..';
import {getGiftCardConfigList} from '../../lib/gift-cards/gift-card';
import {CardConfigMap} from './shop.models';

export const getAvailableGiftCards = (availableCardMap: CardConfigMap) =>
  getGiftCardConfigList(availableCardMap).filter(config => !config.hidden);
