import {BwcProvider} from '../../../../lib/bwc';

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
