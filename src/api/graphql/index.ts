import axios from 'axios';
// import BitAuth from 'bitauth';
import {Network} from '../../constants';
import {BASE_BITPAY_URLS} from '../../constants/config';
import {AppIdentity} from '../../store/app/app.models';
import {GqlQueryParams, GqlResponse} from './graphql.types';

interface GqlApiConfig {
  network?: Network;
  identity?: AppIdentity;
}

class GraphQlApi {
  private static instance: GraphQlApi;
  private network: Network;
  private identity: AppIdentity;

  private get apiHost() {
    return BASE_BITPAY_URLS[this.network];
  }

  private get apiUrl() {
    return `${this.apiHost}/api/v2/graphql`;
  }

  private constructor(network: Network, identity: AppIdentity) {
    this.network = network;
    this.identity = identity;
  }

  static init(network: Network, identity: AppIdentity) {
    if (!GraphQlApi.instance) {
      GraphQlApi.instance = new GraphQlApi(network, identity);
    }

    return GraphQlApi.instance;
  }

  static getInstance() {
    const api = GraphQlApi.instance;

    if (!api) {
      throw new Error('GraphQL API not initialized.');
    }

    return api;
  }

  use(config: GqlApiConfig = {}) {
    const {network, identity} = config;

    if (network) {
      this.network = network;
    }

    if (identity) {
      this.identity = identity;
    }
  }

  request<T = any>(params: GqlQueryParams<any>) {
    const config = {
      headers: {
        'x-identity': this.identity.pub,
        'x-signature': this.sign(params),
      },
    };
    return axios.post<GqlResponse<T>>(this.apiUrl, params, config);
  }

  private sign(params: GqlQueryParams) {
    const unsignedData = `${this.apiHost}/${JSON.stringify(params)}`;
    // const signature: any = BitAuth.sign(unsignedData, this.identity.priv);

    return signature.toString('hex');
  }
}

export default GraphQlApi;
