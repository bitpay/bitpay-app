import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../constants/config';
import {Session, User} from '../store/bitpay-id/bitpay-id.models';
import {hashPassword} from '../utils/password';
import BitPayApi from './bitpay';

export const BitPayIdApi = {
  async fetchSession(): Promise<Session> {
    try {
      const {data: session} = await axios.get<Session>(
        `${BASE_BITPAY_URLS[APP_NETWORK]}/auth/session`,
      );

      return session;
    } catch (err) {
      console.log('err', err);
      throw err;
    }
  },

  async login(
    email: string,
    password: string,
    csrfToken: string,
  ): Promise<{
    accessTypes?: 'merchant' | 'visaCard' | 'visaManagement'[];
    twoFactorPending?: boolean;
    emailAuthenticationPending?: boolean;
  }> {
    const hashedPassword = hashPassword(password);

    const body = {
      email,
      hashedPassword,
      authSource: '',
    };

    if (!hashedPassword) {
      return {accessTypes: []};
    }

    const config = {
      headers: {
        'x-csrf-token': csrfToken,
      },
    };

    try {
      const {data} = await axios.post<{
        /**
         * @param merchant User has merchant capabilities.
         * @param visaCard User has any BitPay cards.
         * @param visaManagement Deprecated.
         */
        accessTypes: 'merchant' | 'visaCard' | 'visaManagement'[];
      }>(`${BASE_BITPAY_URLS[APP_NETWORK]}/auth/login`, body, config);

      return data;
    } catch (err: any) {
      if (err.response?.data?.twoFactorPending) {
        return {twoFactorPending: true};
      } else if (err.response?.data?.emailAuthenticationPending) {
        return {emailAuthenticationPending: true};
      }

      throw err;
    }
  },

  /**
   * Requests a pairing code for an authenticated user.
   * @param csrfToken CSRF token.
   * @returns A secret pairing code.
   */
  async generatePairingCode(csrfToken: string) {
    try {
      const config = {
        headers: {
          'x-csrf-token': csrfToken,
        },
      };

      const {data} = await axios.post<{data: {url: string}}>(
        `${BASE_BITPAY_URLS[APP_NETWORK]}/auth/generateBitAuthPairingCode`,
        null,
        config,
      );

      const pairingUrl = data?.data.url || '';
      const pairingParams = pairingUrl
        .split('?')[1]
        .split('&')
        .reduce((paramMap, kvp) => {
          const [k, v] = kvp.split('=');

          paramMap[k] = v;

          return paramMap;
        }, {} as {[k: string]: string});

      return pairingParams.secret || '';
    } catch (err) {
      console.log('err:', err);
      throw err;
    }
  },

  /**
   * Pairs with a BitPayID and creates an API token.
   * @param secret Encrypted token required to pair the BitPayID.
   * @param code Two-factor authentication code.
   * @returns An API token used to make session-less requests on behalf of the user.
   */
  async pair(secret: string, code?: string): Promise<string> {
    const api = BitPayApi.getInstance();
    const deviceName = DeviceInfo.getDeviceNameSync() || 'unknown device';
    const token = await api.createToken(secret, deviceName, code);

    return token;
  },

  /**
   * Fetches basic user info.
   * @param token API token for a paired user.
   * @returns Basic user info.
   */
  async fetchBasicUserInfo(token: string): Promise<User> {
    const api = BitPayApi.getInstance();
    const response = await api.request<User>('getBasicInfo', token);
    const {data: user, error} = response.data;

    if (error) {
      console.debug('Error while fetching user data.');
      throw new Error(error);
    }

    return user;
  },
};

export default BitPayIdApi;
