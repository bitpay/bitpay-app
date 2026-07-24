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

const isSameLocation = (
  current: LocationData | null,
  next: LocationData,
): boolean =>
  current?.countryShortCode === next.countryShortCode &&
  current?.isEuCountry === next.isEuCountry &&
  current?.stateShortCode === next.stateShortCode &&
  current?.cityFullName === next.cityFullName &&
  current?.locationFullName === next.locationFullName;

export const locationReducer = (
  state: LocationState = initialState,
  action: LocationActionType,
): LocationState => {
  switch (action.type) {
    case LocationActionTypes.SUCCESS_GET_LOCATION: {
      const {locationData} = action.payload;

      if (isSameLocation(state.locationData, locationData)) {
        return state;
      }

      return {
        locationData,
      };
    }

    default:
      return state;
  }
};
