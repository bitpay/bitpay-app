import {
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from '../shop/shop.models';
import {ShopCatalogActionTypes} from './shop-catalog.types';

export const successFetchCatalog = (payload: {
  availableCardMap: CardConfigMap;
  supportedCardMap?: CardConfigMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
}) => ({
  type: ShopCatalogActionTypes.SUCCESS_FETCH_CATALOG as const,
  payload,
});

export const failedFetchCatalog = () => ({
  type: ShopCatalogActionTypes.FAILED_FETCH_CATALOG as const,
});

export const setShopMigrationComplete = () => ({
  type: ShopCatalogActionTypes.SET_SHOP_MIGRATION_COMPLETE as const,
});
