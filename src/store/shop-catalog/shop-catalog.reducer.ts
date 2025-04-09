import {ShopCatalogState} from './shop-catalog.models';
import {
  ShopCatalogActionType,
  ShopCatalogActionTypes,
} from './shop-catalog.types';

export const initialShopCatalogState: ShopCatalogState = {
  availableCardMap: {},
  supportedCardMap: {},
  categoriesAndCurations: {curated: {}, categories: {}},
  integrations: {},
  shopMigrationComplete: false,
};

export function shopCatalogReducer(
  state: ShopCatalogState = initialShopCatalogState,
  action: ShopCatalogActionType,
): ShopCatalogState {
  switch (action.type) {
    case ShopCatalogActionTypes.SUCCESS_FETCH_CATALOG:
      const {
        availableCardMap,
        supportedCardMap,
        categoriesAndCurations,
        integrations,
      } = action.payload;
      return {
        ...state,
        availableCardMap,
        supportedCardMap: {
          ...(state.supportedCardMap || {}),
          ...(supportedCardMap || {}),
          ...availableCardMap,
        },
        categoriesAndCurations,
        integrations,
      };

    case ShopCatalogActionTypes.FAILED_FETCH_CATALOG:
      return state;

    case ShopCatalogActionTypes.SET_SHOP_MIGRATION_COMPLETE:
      return {
        ...state,
        shopMigrationComplete: true,
      };

    default:
      return state;
  }
}
