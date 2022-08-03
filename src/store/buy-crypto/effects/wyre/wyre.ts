import axios from 'axios';
import {LogActions} from '../../../log';

const URI_DEV = 'https://api.testwyre.com';
const URI_PROD = 'https://api.sendwyre.com';

const uri = __DEV__ ? URI_DEV : URI_PROD;

export const wyreGetWalletOrderDetails = async (orderId: string) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.get(uri + '/v3/orders/' + orderId, config);

    return Promise.resolve(data);
  } catch (err) {
    const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
    LogActions.error(`requestBrazeContentRefresh: failed ${errorStr}`);
    return Promise.reject(err);
  }
};
