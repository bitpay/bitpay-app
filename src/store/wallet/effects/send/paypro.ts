import {BwcProvider} from '../../../../lib/bwc';
import {Currencies} from '../../../../constants/currencies';

const BWC = BwcProvider.getInstance();

export interface PayProOptions {
  chain: string;
  currency: string;
  decimals: number;
  estimatedAmount: number;
  minerFee: number;
  network: string;
  requiredFeeRate: number;
  selected: boolean;
}

export const GetPayProOptions = async (
  paymentUrl: string,
  attempt: number = 1,
): Promise<any> => {
  const bwc = BWC.getPayProV2();
  const options: any = {
    paymentUrl,
  };
  const payOpts = await bwc.getPaymentOptions(options).catch(async err => {
    throw err;
    /** TODO: handle me */
    // if (attempt <= 3) {
    //     await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
    //     return GetPayProOptions(paymentUrl, disableLoader, ++attempt);
    // } else {
    //     throw err;
    // }
  });
  return payOpts;
};

export const GetPayProDetails = async (params: {
  paymentUrl: string;
  coin: string;
  payload?: {address?: string};
  attempt?: number;
}): Promise<any> => {
  let {paymentUrl, coin, payload, attempt = 1} = params;
  const bwc = BWC.getPayProV2();
  const chain = Currencies[coin].chain;
  const options: any = {
    paymentUrl,
    chain,
    currency: coin.toUpperCase(),
    payload,
  };

  const payDetails = await bwc.selectPaymentOption(options).catch(async err => {
    throw err;
    /** TODO: handle me */
    // if (attempt <= 3) {
    //     await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
    //     return GetPayProDetails({
    //         paymentUrl,
    //         coin,
    //         payload,
    //         disableLoader,
    //         attempt: ++attempt
    //     });
    // } else {
    //     throw err;
    // }
  });
  return payDetails;
};

export const HandlePayPro = async (
  payProDetails: any,
  payProOptions: any,
  url: string,
  coin: string,
) => {
  if (!payProDetails) {
    return;
  }
  let invoiceID;
  let requiredFeeRate;

  if (payProDetails.requiredFeeRate) {
    requiredFeeRate = !Currencies[coin].properties.isUtxo
      ? parseInt((payProDetails.requiredFeeRate * 1.1).toFixed(0), 10) // Workaround to avoid gas price supplied is lower than requested error
      : Math.ceil(payProDetails.requiredFeeRate * 1000);
  }

  try {
    const {memo, network} = payProDetails;
    if (!payProOptions) {
      payProOptions = await GetPayProOptions(url);
    }
    const paymentOptions = payProOptions.paymentOptions;
    const {estimatedAmount, minerFee} = paymentOptions.find(
      (option: PayProOptions) => option.currency.toLowerCase() === coin,
    );
    const instructions = payProDetails.instructions[0];
    const {outputs, toAddress, data} = instructions;
    if (coin === 'xrp' && outputs) {
      invoiceID = outputs[0].invoiceID;
    }
    const confirmScreenParams = {
      amount: estimatedAmount,
      toAddress,
      description: memo,
      data,
      invoiceID,
      paypro: payProDetails,
      coin,
      network,
      payProUrl: url,
      requiredFeeRate,
      minerFee, // needed for payments with Coinbase accounts
    };
    return confirmScreenParams;
  } catch (err) {
    //Todo: handle me
  }
};
