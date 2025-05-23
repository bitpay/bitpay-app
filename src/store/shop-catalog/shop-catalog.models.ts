import {
  CardConfigMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from '../shop/shop.models';

export interface ShopCatalogState {
  availableCardMap: CardConfigMap;
  supportedCardMap: CardConfigMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
  shopMigrationComplete: boolean;
}
