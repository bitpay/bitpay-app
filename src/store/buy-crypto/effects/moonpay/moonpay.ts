import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  MoonpayGetCurrenciesRequestData,
  MoonpayGetCurrencyLimitsRequestData,
} from '../../buy-crypto.models';
import {moonpaySellEnv} from '../../../../navigation/services/sell-crypto/utils/moonpay-sell-utils';

const bwsUri = BASE_BWS_URL;

export const moonpayGetCurrencies = async (
  requestData: MoonpayGetCurrenciesRequestData,
): Promise<any> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpay/getCurrencies',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const moonpayGetCurrencyLimits = async (
  requestData: MoonpayGetCurrencyLimitsRequestData,
): Promise<any> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpay/currencyLimits',
      requestData,
      config,
    );

    if (data instanceof Array) {
      return Promise.resolve(data[0]);
    } else {
      return Promise.resolve(data);
    }
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const moonpayGetTransactionDetails = async (
  transactionId?: string,
  externalId?: string,
): Promise<any> => {
  try {
    if (!transactionId && !externalId) {
      const msg = 'Missing parameters';
      console.log(msg);
      return Promise.reject(msg);
    }

    let body;
    if (transactionId) {
      body = {
        transactionId,
        env: moonpaySellEnv,
      };
    } else if (externalId) {
      body = {
        externalId,
        env: moonpaySellEnv,
      };
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpay/transactionDetails',
      body,
      config,
    );

    if (data instanceof Array) {
      return Promise.resolve(data[0]);
    } else {
      return Promise.resolve(data);
    }
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

export const moonpayGetSellTransactionDetails = async (
  transactionId?: string,
  externalId?: string,
): Promise<any> => {
  try {
    if (!transactionId && !externalId) {
      const msg = 'Missing parameters';
      return Promise.reject(msg);
    }

    let body;
    if (transactionId) {
      body = {
        transactionId,
        env: moonpaySellEnv,
      };
    } else if (externalId) {
      body = {
        externalId,
        env: moonpaySellEnv,
      };
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpay/sellTransactionDetails',
      body,
      config,
    );

    if (data instanceof Array) {
      return Promise.resolve(data[0]);
    } else {
      return Promise.resolve(data);
    }
  } catch (err) {
    return Promise.reject(err);
  }
};
