import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {EUCountries, UnitedKingdomCountryCode} from './location.constants';
import {logManager} from '../../managers/LogManager';
import {NO_CACHE_HEADERS} from '../../constants/config';
import {LocationData} from './location.models';

export const isEuCountry = (countryShortCode: string | undefined): boolean => {
  if (!countryShortCode) {
    return false;
  }
  return EUCountries.includes(countryShortCode.toUpperCase());
};

export const isUnitedKingdomCountry = (
  countryShortCode: string | undefined,
): boolean => {
  if (!countryShortCode) {
    return false;
  }
  return countryShortCode.toUpperCase() === UnitedKingdomCountryCode;
};

export const getLocationData =
  (): Effect<Promise<LocationData | undefined>> => async dispatch => {
    try {
      const {data: locationData} = await axios.get(
        'https://bitpay.com/location/ipAddress',
        {
          headers: {
            ...NO_CACHE_HEADERS,
            'Content-Type': 'application/json',
          },
        },
      );

      const normalizedLocationData: LocationData = {
        countryShortCode: locationData.country,
        isEuCountry: isEuCountry(locationData.country),
        stateShortCode: locationData.state ?? undefined,
        cityFullName: locationData.city ?? undefined,
        locationFullName: locationData.locationString ?? undefined,
      };

      logManager.info('getLocationData', locationData.country);
      await dispatch(
        LocationActions.successGetLocation({
          locationData: normalizedLocationData,
        }),
      );
      return normalizedLocationData;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error('getLocationData', errStr);
      return undefined;
    }
  };
