import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {RampGetAssetsRequestData} from '../../buy-crypto.models';

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

    const body = {
      env: requestData.env,
      currencyCode: requestData.currencyCode,
      withDisabled: requestData.withDisabled,
      withHidden: requestData.withHidden,
      useIp: requestData.useIp,
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/ramp/assets',
      body,
      config,
    );

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
