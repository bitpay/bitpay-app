import {ShopActionType, ShopActionTypes} from './shop.types';
import {AvailableCardMap} from './shop.models';

export const successFetchCatalog = (payload: {
  availableCardMap: AvailableCardMap;
  categories: any;
  integrations: any;
}): ShopActionType => ({
  type: ShopActionTypes.SUCCESS_FETCH_CATALOG,
  payload,
});

export const failedFetchCatalog = (): ShopActionType => ({
  type: ShopActionTypes.FAILED_FETCH_CATALOG,
});
