import {Wallet} from '../../../../store/wallet/wallet.models';

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
  'wbtc',
];

export const generateMessageId = (walletId?: string) => {
  const now = Date.now();
  if (walletId) {
    return `${walletId}-${now}`;
  }
  const randomInt = Math.floor(1e8 * Math.random());
  return `${randomInt}-${now}`;
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

export const isCoinSupportedToSwap = (coin: string): boolean => {
  return changellySupportedCoins.includes(coin.toLowerCase());
};

export const changellyGetFixRateForAmount = async (
  wallet: Wallet,
  data: ChangellyFixRateDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      amountFrom: data.amountFrom,
    };

    const response = await wallet.changellyGetFixRateForAmount(messageData);

    if (response.id && response?.id !== messageData.id) {
      return Promise.reject(
        'The response does not match the origin of the request',
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const changellyGetPairsParams = async (
  wallet: Wallet,
  data: ChangellyPairParamsDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
    };

    const response = await wallet.changellyGetPairsParams(messageData);

    if (response.id && response.id !== messageData.id) {
      return Promise.reject(
        'The response does not match the origin of the request',
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const changellyCreateFixTransaction = async (
  wallet: Wallet,
  data: ChangellyFixTransactionDataType,
): Promise<any> => {
  try {
    const messageData = {
      id: generateMessageId(wallet.id),
      coinFrom: data.coinFrom,
      coinTo: data.coinTo,
      addressTo: data.addressTo,
      amountFrom: data.amountFrom,
      fixedRateId: data.fixedRateId,
      refundAddress: data.refundAddress,
    };

    const response = await wallet.changellyCreateFixTransaction(messageData);

    if (response.id && response.id !== messageData.id) {
      return Promise.reject(
        'The response does not match the origin of the request',
      );
    }
    return Promise.resolve(response);
  } catch (err) {
    return Promise.reject(err);
  }
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
