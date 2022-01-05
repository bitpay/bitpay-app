import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from './shop.models';

export enum ShopActionTypes {
  SUCCESS_FETCH_CATALOG = 'SHOP/SUCCESS_FETCH_CATALOG',
  FAILED_FETCH_CATALOG = 'SHOP/FAILED_FETCH_CATALOG',
}

interface successFetchCatalog {
  type: typeof ShopActionTypes.SUCCESS_FETCH_CATALOG;
  payload: {
    availableCardMap: AvailableCardMap;
    categoriesAndCurations: CategoriesAndCurations;
    integrations: DirectIntegrationMap;
  };
}

interface failedFetchCatalog {
  type: typeof ShopActionTypes.FAILED_FETCH_CATALOG;
}

export type ShopActionType = successFetchCatalog | failedFetchCatalog;
