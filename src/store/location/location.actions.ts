import {LocationData} from './location.models';
import {LocationActionType, LocationActionTypes} from './location.types';

export const successGetLocation = (payload: {
  locationData: LocationData;
}): LocationActionType => ({
  type: LocationActionTypes.SUCCESS_GET_LOCATION,
  payload,
});
