import axios from 'axios';

const bwsUri = 'https://bws.bitpay.com/bws/api';

export const moonpayGetTransactionDetails = async (
  transactionId?: string,
  externalId?: string,
): Promise<any> => {
  try {
    if (!transactionId && !externalId) {
      const msg = 'Missing parameters';
      console.log(msg);
      return Promise.reject(msg);
    }

    let body;
    if (transactionId) {
      body = {
        transactionId,
      };
    } else if (externalId) {
      body = {
        externalId,
      };
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      bwsUri + '/v1/service/moonpay/transactionDetails',
      body,
      config,
    );

    if (data instanceof Array) {
      return Promise.resolve(data[0]);
    } else {
      return Promise.resolve(data);
    }
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};
