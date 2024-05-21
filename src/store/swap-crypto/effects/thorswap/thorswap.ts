import axios from 'axios';
import {t} from 'i18next';
import {BASE_BWS_URL} from '../../../../constants/config';
import {ThorswapGetSwapQuoteRequestData} from '../../models/thorswap.models';

const bwsUri = BASE_BWS_URL;

export const thorswapGetCurrencies = async (requestData: any) => {
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

export const thorswapGetMinLimit = async (requestData: any) => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/minLimit',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const thorswapGetGasPrice = async (requestData: any) => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/getGasPrice',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const thorswapGetSwapQuote = async (
  requestData: ThorswapGetSwapQuoteRequestData,
) => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/thorswap/getSwapQuote',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const thorswapGetSwapTx = async (requestData: any) => {
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

export const moralisRunContractFunction = async (requestData: any) => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/moralis/moralisRunContractFunction',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};
