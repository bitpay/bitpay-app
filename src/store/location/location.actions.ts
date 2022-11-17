import {CountryData} from './location.models';
import {LocationActionType, LocationActionTypes} from './location.types';

export const successGetCountry = (payload: {
  countryData: CountryData;
  isNyc: boolean | null;
}): LocationActionType => ({
  type: LocationActionTypes.SUCCESS_GET_COUNTRY,
  payload,
});
