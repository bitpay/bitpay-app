import axios from 'axios';
// import BitAuth from 'bitauth';
import {Network} from '../../constants';
import {BASE_BITPAY_URLS} from '../../constants/config';
import {AppIdentity} from '../../store/app/app.models';
import {BpApiResponse} from './bitpay.types';

interface BitPayIdApiConfig {
  overrideHost?: string;
  network?: Network;
  identity?: AppIdentity;
}

export class BitPayIdApi {
  /**
   * Singleton
   */
  private static instance: BitPayIdApi;

  /**
   * Required. Used to determine the API endpoint.
   */
  private _network = Network.mainnet;
  get network() {
    return this._network;
  }

  /**
   * Required. Contains the keys used to sign API requests.
   */
  private _identity: AppIdentity;
  get identity() {
    return this._identity;
  }

  /**
   * Overrides the configured API endpoint base URL if set. Can be changed at runtime.
   */
  private _overrideHost: string | null = null;
  get overrideHost() {
    return this._overrideHost;
  }

  private constructor(
    network: Network,
    identity: AppIdentity,
    config?: BitPayIdApiConfig,
  ) {
    this._network = network;
    this._identity = identity;

    this.use(config);
  }

  /**
   * Initializes the API for the given network and sets the identity keys.
   * @param network
   * @param identity
   * @param config API options.
   * @param config.overrideHost Override the default API base URL.
   * @param config.identity Update the API identity.
   * @returns
   */
  static init(
    network: Network,
    identity: AppIdentity,
    config?: BitPayIdApiConfig,
  ) {
    if (!BitPayIdApi.instance) {
      BitPayIdApi.instance = new BitPayIdApi(network, identity, config);
    }

    return BitPayIdApi.instance;
  }

  /**
   * Get the API singleton. Requires the API to first be initialized.
   * @returns The API instance.
   */
  static getInstance() {
    const api = BitPayIdApi.instance;

    if (!api) {
      throw new Error('BitPay API not initialized.');
    }

    return api;
  }

  static apiCall(token: string, method: string, params?: {[k: string]: any}) {
    return BitPayIdApi.getInstance()
      .request(method, token, params)
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data.data || res.data;
      });
  }

  get host(): string {
    return this.overrideHost || BASE_BITPAY_URLS[this._network];
  }

  get apiUrl(): `${string}/api/v2` {
    return `${this.host}/api/v2`;
  }

  /**
   * Update the API options.
   * @param config API options.
   * @param config.overrideHost Override the default API base URL.
   * @param config.network Override the API network.
   * @param config.identity Update the API identity.
   * @returns The current API instance.
   */
  use(config: BitPayIdApiConfig = {}) {
    const {overrideHost, network, identity} = config;

    if (overrideHost) {
      this._overrideHost = overrideHost;
    }

    if (network) {
      this._network = network;
    }

    if (identity) {
      this._identity = identity;
    }

    return this;
  }

  async createToken(secret: string, deviceName: string, code?: string) {
    let params: any = {
      secret,
      version: 2,
      deviceName,
      code,
    };
    const unsignedData = JSON.stringify(params);
    const signature = BitAuth.sign(unsignedData, this.identity.priv);
    const verified = BitAuth.verifySignature(
      unsignedData,
      this.identity.pub,
      signature,
    );

    if (!verified) {
      throw new Error('Signature could not be verified.');
    }

    params.signature = signature;
    params.pubkey = this.identity.pub;

    const data = {method: 'createToken', params: JSON.stringify(params)};
    const config = {
      headers: {
        'content-type': 'application/json',
      },
    };

    const response = await axios.post<BpApiResponse<string>>(
      this.apiUrl,
      data,
      config,
    );
    const {error, data: token} = response.data;

    if (error) {
      throw new Error(error);
    }

    return token;
  }

  request<T = any>(method: string, token: string, params?: {[k: string]: any}) {
    const url = `${this.apiUrl}/${token || ''}`;
    const data = {
      method,
      params: JSON.stringify(params),
      token,
    };
    const unsignedData = `${url}${JSON.stringify(data)}`;
    const signature: any = BitAuth.sign(unsignedData, this.identity.priv);
    const config = {
      headers: {
        'content-type': 'application/json',
        'x-identity': this.identity.pub,
        'x-signature': signature.toString('hex'),
      },
    };
    return axios.post<BpApiResponse<T>>(url, data, config);
  }
}

export default BitPayIdApi;
