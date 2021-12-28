import {ShopActionType, ShopActionTypes} from './shop.types';
import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from './shop.models';

export const successFetchCatalog = (payload: {
  availableCardMap: AvailableCardMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
}): ShopActionType => ({
  type: ShopActionTypes.SUCCESS_FETCH_CATALOG,
  payload,
});

export const failedFetchCatalog = (): ShopActionType => ({
  type: ShopActionTypes.FAILED_FETCH_CATALOG,
});
