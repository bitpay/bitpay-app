import {Network} from '../constants';
import {BASE_BITPAY_URLS} from '../constants/config';
import {AppIdentity} from '../store/app/app.models';

interface BitPayApiConfig {
  token?: string;
  baseUrl?: string;
  identity?: AppIdentity;
}

export class BitPayApi {
  // static properties
  private static instances: {
    [k: string]: BitPayApi;
  } = {};

  // required properties
  /**
   * Required. Used to determine the API endpoint.
   */
  private network = Network.livenet;

  /**
   * Required. Contains the keys used to sign API requests.
   */
  private identity: AppIdentity;

  /**
   * Overrides the configured API endpoint base URL if set. Can be changed at runtime.
   */
  private baseUrl: string | null = null;

  /**
   * Required to make signed API requests.
   */
  private token: string | null = null;

  private constructor(network: Network, identity: AppIdentity, config?: BitPayApiConfig) {
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
   * @param config.token Update the API token.
   * @param config.identity Update the API identity.
   * @returns 
   */
  static init(network: Network, identity: AppIdentity, config?: BitPayApiConfig) {
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

  get apiUrl(): `${string}/api/v2` {
    const host = this.baseUrl || BASE_BITPAY_URLS[this.network];

    return `${host}/api/v2`;
  }

  /**
   * Update the API options.
   * @param config API options.
   * @param config.baseUrl Override the default API base URL.
   * @param config.token Update the API token.
   * @param config.identity Update the API identity.
   * @returns The current API instance.
   */
  use(config: BitPayApiConfig = {}) {
    const { baseUrl, token, identity } = config;

    if (token) {
      this.token = token;
    }

    if (baseUrl) {
      this.baseUrl = baseUrl;
    }

    if (identity) {
      this.identity = identity;
    }

    return this;
  }
}

export default BitPayApi;
