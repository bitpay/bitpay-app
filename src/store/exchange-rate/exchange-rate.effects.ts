import {Effect, RootState} from '../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../constants/config';
import {ExchangeRateActions} from '.';

export const getRates =
  (): Effect => async (dispatch, getState: () => RootState) => {
    const store = getState();

    try {
      const {data: rates} = await axios.get(`${BASE_BWS_URL}/v3/fiatrates/`);
      dispatch(ExchangeRateActions.successGetRates(rates));
    } catch (err) {
      console.error(err);
      dispatch(ExchangeRateActions.failedGetRates());
    }
  };
