import {
  MoonpayGetSellQuoteData,
  MoonpayGetSellQuoteRequestData,
  MoonpayGetSellSignedPaymentUrlData,
  MoonpayGetSellSignedPaymentUrlRequestData,
} from '../../../../store/sell-crypto/sell-crypto.models';
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

export const moonpayGetSellQuote = async (
  reqData: MoonpayGetSellQuoteRequestData,
): Promise<MoonpayGetSellQuoteData> => {
  try {
    const body: MoonpayGetSellQuoteRequestData = {
      env: reqData.env,
      currencyAbbreviation: reqData.currencyAbbreviation,
      quoteCurrencyCode: reqData.quoteCurrencyCode,
      baseCurrencyAmount: reqData.baseCurrencyAmount,
      extraFeePercentage: reqData.extraFeePercentage,
      payoutMethod: reqData.payoutMethod, // ach_bank_transfer, credit_debit_card, sepa_bank_transfer and gbp_bank_transfer
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data}: {data: MoonpayGetSellQuoteData} = await axios.post(
      bwsUri + '/v1/service/moonpay/sellQuote',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const moonpayGetSellSignedPaymentUrl = async (
  reqData: MoonpayGetSellSignedPaymentUrlRequestData,
): Promise<MoonpayGetSellSignedPaymentUrlData> => {
  try {
    let body: MoonpayGetSellSignedPaymentUrlRequestData = {
      env: reqData.env,
      baseCurrencyCode: reqData.baseCurrencyCode,
      baseCurrencyAmount: reqData.baseCurrencyAmount,
      externalTransactionId: reqData.externalTransactionId,
      redirectURL: reqData.redirectURL,
      refundWalletAddress: reqData.refundWalletAddress,
      lockAmount: reqData.lockAmount,
      colorCode: reqData.colorCode,
      theme: reqData.theme,
      language: reqData.language,
      quoteCurrencyCode: reqData.quoteCurrencyCode,
      showWalletAddressForm: reqData.showWalletAddressForm,
      unsupportedRegionRedirectUrl: reqData.unsupportedRegionRedirectUrl,
      skipUnsupportedRegionScreen: reqData.skipUnsupportedRegionScreen,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data}: {data: MoonpayGetSellSignedPaymentUrlData} = await axios.post(
      bwsUri + '/v1/service/moonpay/sellSignedPaymentUrl',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
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

export const moonpayCancelSellTransaction = async (
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
      bwsUri + '/v1/service/moonpay/cancelSellTransaction',
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
