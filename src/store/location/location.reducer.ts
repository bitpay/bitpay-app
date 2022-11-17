import {CountryData} from './location.models';
import {LocationActionType, LocationActionTypes} from './location.types';

type LocationPersistBlackList = string[];
export const locationReduxPersistBlackList: LocationPersistBlackList = [];

export interface LocationState {
  countryData: CountryData | null;
  isNyc: boolean | null;
}

const initialState: LocationState = {
  countryData: null,
  isNyc: null,
};

export const locationReducer = (
  state: LocationState = initialState,
  action: LocationActionType,
): LocationState => {
  switch (action.type) {
    case LocationActionTypes.SUCCESS_GET_COUNTRY:
      const {countryData, isNyc} = action.payload;
      return {
        countryData: countryData,
        isNyc,
      };

    default:
      return state;
  }
};
