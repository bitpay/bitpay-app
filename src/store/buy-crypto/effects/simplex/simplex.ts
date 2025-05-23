import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  SimplexGetCurrenciesData,
  SimplexGetCurrenciesRequestData,
} from '../../models/simplex.models';

const bwsUri = BASE_BWS_URL;

export const simplexGetCurrencies = async (
  requestData: SimplexGetCurrenciesRequestData,
): Promise<SimplexGetCurrenciesData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data}: {data: SimplexGetCurrenciesData} = await axios.post(
      bwsUri + '/v1/service/simplex/getCurrencies',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
