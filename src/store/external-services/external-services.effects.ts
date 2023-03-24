import axios from 'axios';
import {APP_VERSION} from '../../constants/config';
import {ExternalServicesConfigRequestParams} from './external-services.types';

const uri = 'https://bws.bitpay.com/bws/api';

export const getExternalServicesConfig = async (
  params: ExternalServicesConfigRequestParams,
) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        currentAppVersion: params.currentAppVersion ?? APP_VERSION,
        currentLocationCountry: params.currentLocationCountry,
        currentLocationState: params.currentLocationState,
        bitpayIdLocationCountry: params.bitpayIdLocationCountry,
        bitpayIdLocationState: params.bitpayIdLocationState,
      },
    };

    const {data} = await axios.get(uri + '/v1/services', config);

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(err);
  }
};
