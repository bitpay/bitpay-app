import axios from 'axios';
import {Platform} from 'react-native';
import {Effect} from '..';
import {LogActions} from '../log';
import {APP_VERSION, BASE_BWS_URL} from '../../constants/config';
import {ExternalServicesConfigRequestParams} from './external-services.types';

const bwsUri = BASE_BWS_URL;

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
      const {data} = await axios.get(bwsUri + '/v1/services', config);
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };

export const getSpenderApprovalWhitelist =
  (): Effect<Promise<any>> =>
  async (dispatch): Promise<any> => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      dispatch(LogActions.debug('Getting spender approval white list'));
      const {data} = await axios.get(
        bwsUri + '/v1/services/dex/getSpenderApprovalWhitelist',
        config,
      );
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };
