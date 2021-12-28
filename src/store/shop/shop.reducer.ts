import {
  AvailableCardMap,
  CategoriesAndCurations,
  DirectIntegrationMap,
} from './shop.models';
import {ShopActionType, ShopActionTypes} from './shop.types';

type ShopReduxPersistBlackList = [];
export const shopReduxPersistBlackList: ShopReduxPersistBlackList = [];

export interface ShopState {
  availableCardMap: AvailableCardMap;
  categoriesAndCurations: CategoriesAndCurations;
  integrations: DirectIntegrationMap;
}

const initialState: ShopState = {
  availableCardMap: {},
  categoriesAndCurations: {curated: {}, categories: {}},
  integrations: {},
};

export const shopReducer = (
  state: ShopState = initialState,
  action: ShopActionType,
): ShopState => {
  switch (action.type) {
    case ShopActionTypes.SUCCESS_FETCH_CATALOG:
      const {availableCardMap, categoriesAndCurations, integrations} =
        action.payload;
      return {
        ...state,
        availableCardMap,
        categoriesAndCurations,
        integrations,
      };

    default:
      return state;
  }
};
