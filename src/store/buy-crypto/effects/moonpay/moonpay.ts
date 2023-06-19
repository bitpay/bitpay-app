import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {MoonpayGetCurrencyLimitsRequestData} from '../../buy-crypto.models';

const bwsUri = BASE_BWS_URL;

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
      };
    } else if (externalId) {
      body = {
        externalId,
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
