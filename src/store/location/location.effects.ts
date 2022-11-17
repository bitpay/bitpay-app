import axios from 'axios';
import {LocationActions} from '.';
import {Effect} from '..';
import {SUPPORTED_EVM_COINS} from '../../constants/currencies';
import {getCurrencyCodeFromCoinAndChain} from '../../navigation/bitpay-id/utils/bitpay-id-utils';
import {EUCountries} from './location.constants';

const isEuCountry = (countryShortCode: string) => {
  return EUCountries.includes(countryShortCode);
};

const isNyc = (supportedCurrenciesByLocation: string[]) => {
  let isNyc = false;
  SUPPORTED_EVM_COINS.forEach(chain => {
    const coin = getCurrencyCodeFromCoinAndChain('usdt', chain);
    if (!supportedCurrenciesByLocation.includes(coin)) {
      isNyc = true;
    }
  });
  return isNyc;
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

    // workaround for getting location based on the supported currencies ( in this case usdt -> is nyc )
    // TODO add state to https://bitpay.com/wallet-card/location endpoint and remove this workaround
    const {data: supportedCurrenciesByLocation} = await axios.get(
      'https://bitpay.com/currencies/location?product=app',
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
        isNyc:
          supportedCurrenciesByLocation?.data?.length > 0
            ? isNyc(supportedCurrenciesByLocation.data)
            : null,
      }),
    );
  } catch (err) {
    console.log(err);
  }
};
