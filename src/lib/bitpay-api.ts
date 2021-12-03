import axios from 'axios';
import BitAuth from 'bitauth';
import {Network} from '../constants';
import {BASE_BITPAY_URLS} from '../constants/config';
import {AppIdentity} from '../store/app/app.models';
import {Session, User} from '../store/bitpay-id/bitpay-id.models';
import {hashPassword} from '../utils/password';

interface BitPayApiConfig {
  baseUrl?: string;
  identity?: AppIdentity;
}

export class BitPayApi {
  // static properties
  private static instances: {
    [k: string]: BitPayApi;
  } = {};

  /**
   * Required. Used to determine the API endpoint.
   */
  private network = Network.mainnet;

  /**
   * Required. Contains the keys used to sign API requests.
   */
  private identity: AppIdentity;

  /**
   * Overrides the configured API endpoint base URL if set. Can be changed at runtime.
   */
  private baseUrl: string | null = null;

  private constructor(
    network: Network,
    identity: AppIdentity,
    config?: BitPayApiConfig,
  ) {
    this.network = network;
    this.identity = identity;

    this.use(config);
  }

  /**
   * Initializes the API for the given network and sets the identity keys.
   * @param network
   * @param identity
   * @param config API options.
   * @param config.baseUrl Override the default API base URL.
   * @param config.identity Update the API identity.
   * @returns
   */
  static init(
    network: Network,
    identity: AppIdentity,
    config?: BitPayApiConfig,
  ) {
    if (!BitPayApi.instances[network]) {
      BitPayApi.instances[network] = new BitPayApi(network, identity, config);
    }

    return BitPayApi.instances[network];
  }

  /**
   * Get the API instance for the provided network. Requires the API to first be initialized for that network.
   * @param network
   * @returns The API instance for the provided network.
   */
  static getInstance(network: Network) {
    const api = BitPayApi.instances[network];

    if (!api) {
      throw new Error(`BitPay API for ${network} not initialized.`);
    }

    return api;
  }

  get host(): string {
    return this.baseUrl || BASE_BITPAY_URLS[this.network];
  }

  get apiUrl(): `${string}/api/v2` {
    return `${this.host}/api/v2`;
  }

  /**
   * Update the API options.
   * @param config API options.
   * @param config.baseUrl Override the default API base URL.
   * @param config.identity Update the API identity.
   * @returns The current API instance.
   */
  use(config: BitPayApiConfig = {}) {
    const {baseUrl, identity} = config;

    if (baseUrl) {
      this.baseUrl = baseUrl;
    }

    if (identity) {
      this.identity = identity;
    }

    return this;
  }

  async fetchSession(): Promise<Session> {
    try {
      const {data: session} = await axios.get<Session>(
        `${this.host}/auth/session`,
      );

      return session;
    } catch (err) {
      console.log('err', err);
      throw err;
    }
  }

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
      }>(`${this.host}/auth/login`, body, config);

      return data;
    } catch (err: any) {
      if (err.response?.data?.twoFactorPending) {
        return {twoFactorPending: true};
      } else if (err.response?.data?.emailAuthenticationPending) {
        return {emailAuthenticationPending: true};
      }

      throw err;
    }
  }

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
        `${this.host}/auth/generateBitAuthPairingCode`,
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
  }

  /**
   * Pairs with a BitPayID and fetches the user's basic data.
   * @param secret Encrypted token required to pair the BitPayID.
   * @param deviceName The name of the device running the app.
   * @param code Two-factor authentication code.
   * @returns An API token and basic data for the paired user.
   */
  async pairAndFetchUser(
    secret: string,
    deviceName: string,
    code?: string,
  ): Promise<{token: string; user: User}> {
    const token = await this.pair(secret, deviceName, code);
    const user = await this.getUser(token);

    return {token, user};
  }

  /**
   * Pairs with a BitPayID and fetches an API token to make future requests.
   * @param secret Encrypted token required to pair the BitPayID.
   * @param deviceName The name of the device running the app.
   * @param code Two-factor authentication code.
   * @returns An API token used to make session-less requests on behalf of the user.
   */
  async pair(
    secret: string,
    deviceName: string,
    code?: string,
  ): Promise<string> {
    const unsignedParams: any = {
      secret,
      version: 2,
      deviceName,
      code,
    };

    const unsignedData = JSON.stringify(unsignedParams);
    const signature = BitAuth.sign(unsignedData, this.identity.priv);
    const verified = BitAuth.verifySignature(
      unsignedData,
      this.identity.pub,
      signature,
    );

    if (!verified) {
      throw new Error('Signature could not be verified.');
    }

    const params = JSON.stringify({
      ...unsignedParams,
      signature,
      pubkey: this.identity.pub,
    });
    const url = this.apiUrl;
    const data = {method: 'createToken', params};
    const config = {headers: {'content-type': 'application/json'}};

    const {data: response} = await axios.post<{data: string}>(
      url,
      data,
      config,
    );
    const token = response.data;

    return token;
  }

  /**
   * Fetches basic user info.
   * @param token API token for a paired user.
   * @returns Basic user info.
   */
  async getUser(token: string): Promise<User> {
    const url = `${this.apiUrl}/${token}`;
    const data = {method: 'getBasicInfo', token};
    const signature: any = BitAuth.sign(
      `${this.apiUrl}/${token}${JSON.stringify(data)}`,
      this.identity.priv,
    );
    const config = {
      headers: {
        'content-type': 'application/json',
        'x-identity': this.identity.pub,
        'x-signature': signature.toString('hex'),
      },
    };

    const {
      data: {data: user, error},
    } = await axios.post<{data: User; error: any}>(url, data, config);

    if (error) {
      console.debug('Error while fetching user data.');
      throw new Error(error);
    }

    return user;
  }
}

export default BitPayApi;
