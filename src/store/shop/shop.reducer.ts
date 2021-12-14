import {AvailableCardMap} from './shop.models';
import {ShopActionType, ShopActionTypes} from './shop.types';

type ShopReduxPersistBlackList = [];
export const shopReduxPersistBlackList: ShopReduxPersistBlackList = [];

export interface ShopState {
  availableCardMap: AvailableCardMap;
  categories: any;
  integrations: any;
}

const initialState: ShopState = {
  availableCardMap: {},
  categories: {curated: {}, categories: {}},
  integrations: {},
};

export const shopReducer = (
  state: ShopState = initialState,
  action: ShopActionType,
): ShopState => {
  switch (action.type) {
    case ShopActionTypes.SUCCESS_FETCH_CATALOG:
      const {availableCardMap, categories, integrations} = action.payload;
      return {
        ...state,
        availableCardMap,
        categories,
        integrations,
      };

    default:
      return state;
  }
};
