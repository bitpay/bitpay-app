import axios from 'axios';
import {Wallet} from '../../../../store/wallet/wallet.models';

const uri = 'https://bws.bitpay.com/bws/api';

export const changellySupportedCoins = [
  'btc',
  'bch',
  'eth',
  'busd',
  'usdc',
  'dai',
  'doge',
  'ltc',
  'usdt',
  'bat',
  'shib',
  'xrp',
];

const generateMessageId = (walletId?: string) => {
  const now = Date.now();
  if (walletId) {
    return `${walletId}-${now}`;
  }
  const randomInt = Math.floor(1e8 * Math.random());
  return `${randomInt}-${now}`;
};

export const changellyGetCurrencies = async (full?: boolean) => {
  try {
    const body = {
      id: generateMessageId(),
      full,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      uri + '/v1/service/changelly/getCurrencies',
      body,
      config,
    );

    if (data.id && data.id != body.id) {
      console.log('The response does not match the origin of the request');
    }

    return data;
  } catch (err) {
    console.log(err);
  }
};

export interface ChangellyFixRateDataType {
  amountFrom: number;
  coinFrom: string;
  coinTo: string;
}

export interface ChangellyPairParamsDataType {
  coinFrom: string;
  coinTo: string;
}

export interface ChangellyFixTransactionDataType {
  coinFrom: string;
  coinTo: string;
  addressTo: string;
  amountFrom: number;
  fixedRateId: string;
  refundAddress: string;
}

export const changellyGetFixRateForAmount = (
  wallet: Wallet,
  data: ChangellyFixRateDataType,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      amountFrom: data.amountFrom,
    };

    wallet
      .changellyGetFixRateForAmount(messageData)
      .then((data: any) => {
        if (data.id && data.id != messageData.id) {
          return reject(
            'The response does not match the origin of the request',
          );
        }
        return resolve(data);
      })
      .catch((err: any) => {
        return reject(err);
      });
  });
};

export const changellyGetPairsParams = (
  wallet: Wallet,
  data: ChangellyPairParamsDataType,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
    };

    wallet
      .changellyGetPairsParams(messageData)
      .then(data => {
        if (data.id && data.id != messageData.id) {
          return reject(
            'The response does not match the origin of the request',
          );
        }
        return resolve(data);
      })
      .catch(err => {
        return reject(err);
      });
  });
};

export const changellyCreateFixTransaction = (
  wallet: Wallet,
  data: ChangellyFixTransactionDataType,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      addressTo: data.addressTo,
      amountFrom: data.amountFrom,
      fixedRateId: data.fixedRateId,
      refundAddress: data.refundAddress,
    };

    wallet
      .changellyCreateFixTransaction(messageData)
      .then(data => {
        if (data.id && data.id != messageData.id) {
          return reject(
            'The response does not match the origin of the request',
          );
        }
        return resolve(data);
      })
      .catch(err => {
        return reject(err);
      });
  });
};

export interface Status {
  statusTitle?: string;
  statusDescription?: string;
}

export const changellyGetStatusDetails = (status: string): Status => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'new':
      statusTitle = 'New';
      statusDescription = 'Transaction is waiting for an incoming payment.';
      break;
    case 'waiting':
      statusTitle = 'Waiting';
      statusDescription = 'Transaction is waiting for an incoming payment.';
      break;
    case 'confirming':
      statusTitle = 'Confirming';
      statusDescription =
        'Changelly has received payin and is waiting for certain amount of confirmations depending of incoming currency.';
      break;
    case 'exchanging':
      statusTitle = 'Exchanging';
      statusDescription = 'Payment was confirmed and is being exchanged.';
      break;
    case 'sending':
      statusTitle = 'Sending';
      statusDescription = 'Coins are being sent to the recipient address.';
      break;
    case 'finished':
      statusTitle = 'Finished';
      statusDescription =
        'Coins were successfully sent to the recipient address.';
      break;
    case 'failed':
      statusTitle = 'Failed';
      statusDescription =
        'Transaction has failed. In most cases, the amount was less than the minimum.';
      break;
    case 'refunded':
      statusTitle = 'Failed';
      statusDescription =
        "Exchange failed and coins were refunded to user's wallet.";
      break;
    case 'hold':
      statusTitle = 'Hold';
      statusDescription = 'Due to AML/KYC procedure, exchange may be delayed.';
      break;
    case 'expired':
      statusTitle = 'Expired';
      statusDescription = 'Payin was not sent within the indicated timeframe.';
      break;
    default:
      statusTitle = undefined;
      statusDescription = undefined;
      break;
  }
  return {
    statusTitle,
    statusDescription,
  };
};

export const changellyGetStatus = (
  exchangeTxId: string,
  oldStatus: string,
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const body = {
        id: generateMessageId(),
        exchangeTxId,
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      console.log(
        'Making a Changelly request with body: ' + JSON.stringify(body),
      );

      const {data} = await axios.post(
        uri + '/v1/service/changelly/getStatus',
        body,
        config,
      );

      if (data.id && data.id != body.id) {
        console.log('The response does not match the origin of the request');
      }

      data.exchangeTxId = exchangeTxId;
      data.oldStatus = oldStatus;
      return resolve(data);
    } catch (err) {
      console.log(err);
      return reject(err);
    }
  });
};

export const changellyGetStatusColor = (status: string): string => {
  switch (status) {
    case 'finished':
    case 'refunded':
      return '#01d1a2';
    case 'failed':
    case 'expired':
      return '#df5264';
    case 'waiting':
    case 'confirming':
    case 'exchanging':
    case 'sending':
    case 'hold':
      return '#fdb455';
    default:
      return '#666677';
  }
};
