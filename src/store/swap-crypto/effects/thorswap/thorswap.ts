import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  ThorswapCurrency,
  ThorswapGetCurrenciesRequestData,
  ThorswapGetSwapTxData,
  ThorswapGetSwapTxRequestData,
} from '../../models/thorswap.models';

const bwsUri = BASE_BWS_URL;

export const thorswapGetCurrencies = async (
  requestData: ThorswapGetCurrenciesRequestData,
): Promise<ThorswapCurrency[]> => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/cryptoCurrencies',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const thorswapGetSupportedChains = async (requestData: any) => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/supportedChains',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const thorswapGetSwapTx = async (
  requestData: ThorswapGetSwapTxRequestData,
): Promise<ThorswapGetSwapTxData> => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/getSwapTx',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};
