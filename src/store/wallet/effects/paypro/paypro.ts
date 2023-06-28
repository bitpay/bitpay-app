import {BwcProvider} from '../../../../lib/bwc';
import {BitpaySupportedCoins} from '../../../../constants/currencies';
import {getCurrencyCodeFromCoinAndChain} from '../../../../navigation/bitpay-id/utils/bitpay-id-utils';

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
  chain: string;
  payload?: {address?: string};
  attempt?: number;
}): Promise<any> => {
  let {paymentUrl, coin, chain, payload, attempt = 1} = params;
  const bwc = BWC.getPayProV2();
  const options: any = {
    paymentUrl,
    chain: chain.toUpperCase(),
    currency: getCurrencyCodeFromCoinAndChain(coin.toLowerCase(), chain),
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
  chain,
}: {
  payProDetails: any;
  payProOptions?: PayProOptions;
  url: string;
  coin: string;
  chain: string;
}) => {
  if (!payProDetails) {
    return;
  }
  let invoiceID;
  let requiredFeeRate;

  if (payProDetails.requiredFeeRate) {
    requiredFeeRate = !BitpaySupportedCoins[chain.toLowerCase()].properties
      .isUtxo
      ? parseInt((payProDetails.requiredFeeRate * 1.1).toFixed(0), 10) // Workaround to avoid gas price supplied is lower than requested error
      : Math.ceil(payProDetails.requiredFeeRate * 1000);
  }

  try {
    const {memo, network} = payProDetails;
    if (!payProOptions) {
      payProOptions = await GetPayProOptions(url);
    }
    const invoiceCurrency = getCurrencyCodeFromCoinAndChain(
      GetInvoiceCurrency(coin).toLowerCase(),
      chain,
    );
    const paymentOptions = payProOptions.paymentOptions;
    const {estimatedAmount, minerFee} = paymentOptions.find(
      option => option?.currency === invoiceCurrency,
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
    throw err;
    //Todo: handle me
  }
};

export const GetInvoiceCurrency = (c: string) => {
  switch (c.toUpperCase()) {
    case 'USDP':
      return 'PAX'; // TODO workaround. Remove this when usdp is accepted as an option
    default:
      return c;
  }
};
