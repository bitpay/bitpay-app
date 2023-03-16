import {LocationData} from './location.models';
import {LocationActionType, LocationActionTypes} from './location.types';

type LocationPersistBlackList = string[];
export const locationReduxPersistBlackList: LocationPersistBlackList = [];

export interface LocationState {
  locationData: LocationData | null;
}

const initialState: LocationState = {
  locationData: null,
};

export const locationReducer = (
  state: LocationState = initialState,
  action: LocationActionType,
): LocationState => {
  switch (action.type) {
    case LocationActionTypes.SUCCESS_GET_LOCATION:
      const {locationData} = action.payload;
      return {
        locationData: locationData,
      };

    default:
      return state;
  }
};
