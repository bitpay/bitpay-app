import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {useLogger} from '../../utils/hooks';
import {EUCountries} from './location.constants';

const isEuCountry = (countryShortCode: string) => {
  return EUCountries.includes(countryShortCode);
};

export const getCountry = (): Effect => async dispatch => {
  const logger = useLogger();
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
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error(`getCountry: ${errMsg}`);
  }
};
