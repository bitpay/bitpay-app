import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {RampGetAssetsRequestData} from '../../models/ramp.models';
import {
  RampSellTransactionDetails,
  RampGetSellTransactionDetailsRequestData,
} from '../../../sell-crypto/models/ramp-sell.models';

const bwsUri = BASE_BWS_URL;

export const rampGetAssets = async (
  requestData: RampGetAssetsRequestData,
): Promise<any> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      BASE_BWS_URL + '/v1/service/ramp/assets',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const rampGetSellTransactionDetails = async (
  requestData: RampGetSellTransactionDetailsRequestData,
): Promise<RampSellTransactionDetails> => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/ramp/sellTransactionDetails',
      requestData,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
