import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {sardineEnv} from '../../../../navigation/services/buy-crypto/utils/sardine-utils';
import {
  SardineGetOrderDetailsRequestData,
  SardinePaymentType,
  SardinePaymentUrlConfigParams,
} from '../../buy-crypto.models';

const bwsUri = BASE_BWS_URL;

export const sardineGetCurrencyLimits = async (
  fiatCurrency: string,
  sardinePaymentMethod?: SardinePaymentType,
) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = {
      env: sardineEnv,
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/sardine/currencyLimits',
      body,
      config,
    );

    const sardineCurrenciesLimitsData: any[] = data.data;
    const selectedFiatCurrencyLimitsData = sardineCurrenciesLimitsData.find(
      (currency: any) => currency.currencyCode === fiatCurrency,
    );
    const selectedPaymentMethodLimitsData =
      selectedFiatCurrencyLimitsData.paymentOptions.find(
        (payment: any) =>
          payment.subType === sardinePaymentMethod ||
          payment.subTypes.includes(sardinePaymentMethod),
      );

    return Promise.resolve(selectedPaymentMethodLimitsData);
  } catch (err) {
    return Promise.reject(err);
  }
};

const getCheckoutUrl = (): string => {
  return __DEV__
    ? 'https://crypto.sandbox.sardine.ai'
    : 'https://crypto.sardine.ai';
};

export const sardineGetSignedPaymentUrl = (
  paymentUrlConfigParams: SardinePaymentUrlConfigParams,
): string => {
  const dataSrc: any = {
    env: paymentUrlConfigParams.env,
    client_token: paymentUrlConfigParams.client_token,
    address: paymentUrlConfigParams.address,
    redirect_url: paymentUrlConfigParams.redirect_url,
    fixed_fiat_amount: paymentUrlConfigParams.fixed_fiat_amount,
    fixed_fiat_currency: paymentUrlConfigParams.fixed_fiat_currency,
    fixed_asset_type: paymentUrlConfigParams.fixed_asset_type,
    fixed_network: paymentUrlConfigParams.fixed_network,
    supported_tokens: paymentUrlConfigParams.supported_tokens,
  };

  let urlParams = '';
  for (let key in dataSrc) {
    if (urlParams !== '') {
      urlParams += '&';
    }
    urlParams += key + '=' + encodeURIComponent(dataSrc[key]);
  }

  const checkoutUrl = getCheckoutUrl();

  const url = `${checkoutUrl}/?${urlParams}`;

  return url;
};

export const sardineGetOrderDetails = async (
  requestData: SardineGetOrderDetailsRequestData,
): Promise<any> => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/sardine/ordersDetails',
      body,
      config,
    );

    if (data?.data && data.data instanceof Array) {
      return Promise.resolve(data.data[0]);
    } else {
      return Promise.resolve(data);
    }
  } catch (err) {
    return Promise.reject(err);
  }
};
