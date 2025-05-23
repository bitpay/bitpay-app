import {
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from '../shop/shop.models';

export enum ShopCatalogActionTypes {
  SUCCESS_FETCH_CATALOG = 'SHOP_CATALOG/SUCCESS_FETCH_CATALOG',
  FAILED_FETCH_CATALOG = 'SHOP_CATALOG/FAILED_FETCH_CATALOG',
  SET_SHOP_MIGRATION_COMPLETE = 'SHOP_CATALOG/SET_SHOP_MIGRATION_COMPLETE',
}

export interface successFetchCatalog {
  type: typeof ShopCatalogActionTypes.SUCCESS_FETCH_CATALOG;
  payload: {
    availableCardMap: CardConfigMap;
    supportedCardMap?: CardConfigMap;
    categoriesAndCurations: CategoriesAndCurations;
    integrations: DirectIntegrationMap;
  };
}

export interface failedFetchCatalog {
  type: typeof ShopCatalogActionTypes.FAILED_FETCH_CATALOG;
}

export interface setShopMigrationComplete {
  type: typeof ShopCatalogActionTypes.SET_SHOP_MIGRATION_COMPLETE;
}

export type ShopCatalogActionType =
  | successFetchCatalog
  | failedFetchCatalog
  | setShopMigrationComplete;
