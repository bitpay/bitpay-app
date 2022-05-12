import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {EUCountries} from './location.constants';

const isEuCountry = (countryShortCode: string) => {
  return EUCountries.includes(countryShortCode);
};

export const getCountry = (): Effect => async dispatch => {
  try {
    const {data: countryData} = await axios.get(
      'https://bitpay.com/wallet-card/location',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );

    await dispatch(
      LocationActions.successGetCountry({
        countryData: {
          shortCode: countryData.country,
          isEuCountry: isEuCountry(countryData.country),
        },
      }),
    );
  } catch (err) {
    console.log(err);
  }
};
