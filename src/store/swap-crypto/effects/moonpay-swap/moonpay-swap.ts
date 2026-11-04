import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {
  MoonpaySwapTokenListByChain,
  MoonpaySwapTokenListRequestData,
} from '../../models/moonpay-swap.models';
import {logManager} from '../../../../managers/LogManager';

const bwsUri = BASE_BWS_URL;

export const moonpaySwapGetTokenList = async (
  requestData: MoonpaySwapTokenListRequestData,
): Promise<MoonpaySwapTokenListByChain> => {
  try {
    const body = requestData;

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpaySwap/tokenList',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error fetching Moonpay Swap supported tokens: ' + errStr);
    return Promise.reject(err);
  }
};
