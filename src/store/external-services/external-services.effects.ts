import axios from 'axios';
import {Platform} from 'react-native';
import {Effect} from '..';
import {APP_VERSION} from '../../constants/config';
import {LogActions} from '../log';
import {ExternalServicesConfigRequestParams} from './external-services.types';

const uri = 'https://bws.bitpay.com/bws/api';

export const getExternalServicesConfig =
  (params: ExternalServicesConfigRequestParams): Effect<Promise<any>> =>
  async (dispatch): Promise<any> => {
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
          platform: {
            os: Platform.OS,
            version: Platform.Version,
          },
        },
      };

      dispatch(
        LogActions.debug(
          `Getting external services config with params: ${JSON.stringify(
            config.params,
          )}`,
        ),
      );

      const {data} = await axios.get(uri + '/v1/services', config);

      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };
