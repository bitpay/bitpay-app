import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {EUCountries} from './location.constants';

const isEuCountry = (countryShortCode: string) => {
  return EUCountries.includes(countryShortCode);
};

export const getLocationData = (): Effect => async dispatch => {
  try {
    const {data: locationData} = await axios.get(
      'https://bitpay.com/location/ipAddress',
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

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
    console.log(err);
  }
};
