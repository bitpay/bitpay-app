import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {TransakFiatCurrenciesData} from '../../buy-crypto.models';

const bwsUri = BASE_BWS_URL;

export const transakGetFiatCurrencies = async (requestData: {
  env: 'sandbox' | 'production';
}): Promise<TransakFiatCurrenciesData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/fiatCurrencies',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
