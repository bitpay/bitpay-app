import {CountryData} from './location.models';
import {LocationActionType, LocationActionTypes} from './location.types';

type LocationPersistBlackList = string[];
export const locationReduxPersistBlackList: LocationPersistBlackList = [];

export interface LocationState {
  countryData: CountryData | null;
}

const initialState: LocationState = {
  countryData: null,
};

export const locationReducer = (
  state: LocationState = initialState,
  action: LocationActionType,
): LocationState => {
  switch (action.type) {
    case LocationActionTypes.SUCCESS_GET_COUNTRY:
      const {countryData} = action.payload;
      return {
        countryData: countryData,
      };

    default:
      return state;
  }
};
