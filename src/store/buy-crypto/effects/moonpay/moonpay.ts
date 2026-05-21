import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  MoonpayGetCurrenciesRequestData,
  MoonpayGetCurrencyLimitsRequestData,
  MoonpayGetQuoteEmbeddedRequestData,
  MoonpayGetTransactionDetailsEmbeddedRequestData,
  MoonpayQuoteEmbeddedData,
  MoonpayTransactionDetailsEmbeddedData,
} from '../../buy-crypto.models';
import {moonpaySellEnv} from '../../../../navigation/services/sell-crypto/utils/moonpay-sell-utils';
import {logManager} from '../../../../managers/LogManager';
import {moonpayEnv} from '../../../../navigation/services/buy-crypto/utils/moonpay-utils';

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
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Moonpay currencies: ' + errStr);
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
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Moonpay currency limits: ' + errStr);
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
      logManager.debug('[moonpayGetTransactionDetails]' + msg);
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
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Moonpay transaction details: ' + errStr);
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

export const moonpayGetPaymentMethodsEmbedded = async (
  requestData: any,
): Promise<any> => {
  const URL_BASE =
    moonpayEnv === 'sandbox'
      ? 'https://api.moonpay.com'
      : 'https://api.moonpay.com';
  const URL = URL_BASE + '/platform/v1/payment-methods';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + requestData.accessToken,
  };
  try {
    const {data} = await axios.get(URL, {headers});
    return Promise.resolve(data);
  } catch (err: any) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error getting Moonpay quote embedded: ' + errStr);
    return Promise.reject(err);
  }
};

export const moonpayGetQuoteEmbedded = async (
  requestData: MoonpayGetQuoteEmbeddedRequestData,
): Promise<MoonpayQuoteEmbeddedData> => {
  const URL_BASE =
    moonpayEnv === 'sandbox'
      ? 'https://api.moonpay.com'
      : 'https://api.moonpay.com';
  const URL = URL_BASE + '/platform/v1/quotes/buy';

  const body = {
    source: {
      asset: {code: requestData.baseCurrencyCode},
      amount: requestData.baseCurrencyAmount.toString(),
    },
    destination: {
      asset: {code: requestData.currencyAbbreviation},
    },
    wallet: {
      address: requestData.destinationAddress,
    },
    paymentMethod: {
      type: requestData.paymentMethod,
    },
  };

  try {
    const data = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requestData.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const jsonData = await data.json();
    return Promise.resolve(jsonData?.data ?? jsonData);
  } catch (err: any) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error getting Moonpay quote embedded: ' + errStr);
    return Promise.reject(err);
  }
};

export const moonpayGetTransactionDetailsEmbedded = async (
  requestData: MoonpayGetTransactionDetailsEmbeddedRequestData,
): Promise<MoonpayTransactionDetailsEmbeddedData> => {
  const URL_BASE =
    moonpayEnv === 'sandbox'
      ? 'https://api.moonpay.com'
      : 'https://api.moonpay.com';
  const URL =
    URL_BASE + '/platform/v1/transactions/' + requestData.transactionId;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + requestData.accessToken,
  };

  try {
    const {data} = await axios.get(URL, {headers});
    return Promise.resolve(data?.data ?? data);
  } catch (err: any) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error(
      'Error getting Moonpay transaction details embedded: ' + errStr,
    );
    return Promise.reject(err);
  }
};
