import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {EUCountries} from './location.constants';
import cloneDeep from 'lodash.clonedeep';
import {logManager} from '../../managers/LogManager';
import {NO_CACHE_HEADERS} from '../../constants/config';

export const isEuCountry = (countryShortCode: string | undefined): boolean => {
  if (!countryShortCode) {
    return false;
  }
  return EUCountries.includes(cloneDeep(countryShortCode).toUpperCase());
};

export const getLocationData = (): Effect => async dispatch => {
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

    logManager.info('getLocationData', locationData.country);
    await dispatch(
      LocationActions.successGetLocation({
        locationData: {
          countryShortCode: locationData.country,
          isEuCountry: isEuCountry(locationData.country),
          stateShortCode: locationData.state ?? undefined,
          cityFullName: locationData.city ?? undefined,
          locationFullName: locationData.locationString ?? undefined,
        },
      }),
    );
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('getLocationData', errStr);
  }
};
