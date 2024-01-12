import {LocationData} from './location.models';

export enum LocationActionTypes {
  SUCCESS_GET_LOCATION = 'LOCATION/SUCCESS_GET_LOCATION',
}

interface successGetLocation {
  type: typeof LocationActionTypes.SUCCESS_GET_LOCATION;
  payload: {
    locationData: LocationData;
  };
}

export type LocationActionType = successGetLocation;
