import {BwcProvider} from '../../../../lib/bwc';
import {Currencies} from '../../../../constants/currencies';

const BWC = BwcProvider.getInstance();
export interface PayProPaymentOption {
  chain: string;
  currency: string;
  decimals: number;
  estimatedAmount: number;
  minerFee: number;
  network: string;
  requiredFeeRate: number;
  selected: boolean;
}
export interface PayProOptions {
  time: string;
  expires: string;
  memo: string;
  paymentId: string;
  paymentOptions: PayProPaymentOption[];
  payProUrl: string;
}

export const GetPayProOptions = async (
  paymentUrl: string,
  attempt: number = 1,
): Promise<PayProOptions> => {
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
  const chain = Currencies[coin.toLowerCase()].chain;
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

export const HandlePayPro = async ({
  payProDetails,
  payProOptions,
  url,
  coin,
}: {
  payProDetails: any;
  payProOptions?: PayProOptions;
  url: string;
  coin: string;
}) => {
  if (!payProDetails) {
    return;
  }
  let invoiceID;
  let requiredFeeRate;

  if (payProDetails.requiredFeeRate) {
    requiredFeeRate = !Currencies[coin.toLowerCase()].properties.isUtxo
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
      option => option?.currency.toLowerCase() === coin.toLowerCase(),
    ) as PayProPaymentOption;
    const {outputs, toAddress, data, gasLimit} = payProDetails.instructions[0];
    if (coin === 'xrp' && outputs) {
      invoiceID = outputs[0].invoiceID;
    }
    const confirmScreenParams = {
      amount: estimatedAmount,
      toAddress,
      description: memo,
      data,
      gasLimit,
      invoiceID,
      payPro: payProDetails,
      coin,
      network,
      payProUrl: url,
      requiredFeeRate,
      minerFee, // For payments with Coinbase accounts
    };
    return confirmScreenParams;
  } catch (err) {
    //Todo: handle me
  }
};
