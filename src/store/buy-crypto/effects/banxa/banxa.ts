import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  BanxaCreateOrderData,
  BanxaCreateOrderRequestData,
  BanxaGetOrderDetailsRequestData,
  BanxaGetPaymentMethodsRequestData,
  BanxaGetQuoteRequestData,
  BanxaOrderDetailsData,
  BanxaPaymentMethodsData,
  BanxaQuoteData,
} from '../../buy-crypto.models';

const bwsUri = BASE_BWS_URL;

export const banxaGetPaymentMethods = async (
  requestData: BanxaGetPaymentMethodsRequestData,
): Promise<BanxaPaymentMethodsData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/banxa/paymentMethods',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const banxaGetQuote = async (
  requestData: BanxaGetQuoteRequestData,
): Promise<BanxaQuoteData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/banxa/quote',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const banxaCreateOrder = async (
  requestData: BanxaCreateOrderRequestData,
): Promise<BanxaCreateOrderData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/banxa/createOrder',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const banxaGetOrderDetails = async (
  requestData: BanxaGetOrderDetailsRequestData,
): Promise<BanxaOrderDetailsData> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = requestData;

    const {data} = await axios.post(
      bwsUri + '/v1/service/banxa/getOrder',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
