import axios from 'axios';

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
    console.log(err);
    return Promise.reject(err);
  }
};
