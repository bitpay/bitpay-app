import axios from 'axios';
import {Platform} from 'react-native';
import {Effect} from '..';
import {LogActions} from '../log';
import {
  APP_VERSION,
  BASE_BWS_URL,
  NO_CACHE_HEADERS,
} from '../../constants/config';
import {ExternalServicesConfigRequestParams} from './external-services.types';
import {logManager} from '../../managers/LogManager';

const bwsUri = BASE_BWS_URL;

export const getExternalServicesConfig =
  (params: ExternalServicesConfigRequestParams): Effect<Promise<any>> =>
  async (dispatch): Promise<any> => {
    try {
      const config = {
        headers: {
          ...NO_CACHE_HEADERS,
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

      logManager.debug(
        `Getting external services config with params: ${JSON.stringify(
          config.params,
        )}`,
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
          ...NO_CACHE_HEADERS,
          'Content-Type': 'application/json',
        },
      };

      logManager.debug('Getting spender approval white list');
      const {data} = await axios.get(
        bwsUri + '/v1/services/dex/getSpenderApprovalWhitelist',
        config,
      );
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };
