import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  TransakFiatCurrenciesData,
  TransakGetOrderDetailsRequestData,
  TransakGetQuoteRequestData,
  TransakGetSignedUrlRequestData,
  TransakOrderDetailsData,
  TransakQuoteData,
  TransakSignedUrlData,
} from '../../buy-crypto.models';

const bwsUri = BASE_BWS_URL;

export const transakGetAccessToken = async (requestData: any): Promise<any> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/getAccessToken',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const transakGetCryptoCurrencies = async (
  requestData: any,
): Promise<any> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/cryptoCurrencies',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

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

export const transakGetQuote = async (
  requestData: TransakGetQuoteRequestData,
): Promise<TransakQuoteData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/quote',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const transakGetSignedPaymentUrl = async (
  requestData: TransakGetSignedUrlRequestData,
): Promise<TransakSignedUrlData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/signedPaymentUrl',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const transakGetOrderDetails = async (
  requestData: TransakGetOrderDetailsRequestData,
): Promise<TransakOrderDetailsData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/transak/orderDetails',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
