import {CountryData} from './location.models';

export enum LocationActionTypes {
  SUCCESS_GET_COUNTRY = 'LOCATION/SUCCESS_GET_COUNTRY',
}

interface successGetCountry {
  type: typeof LocationActionTypes.SUCCESS_GET_COUNTRY;
  payload: {
    countryData: CountryData;
  };
}

export type LocationActionType = successGetCountry;
