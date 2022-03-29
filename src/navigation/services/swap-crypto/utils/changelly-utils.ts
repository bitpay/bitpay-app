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
