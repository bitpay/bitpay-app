import cloneDeep from 'lodash.clonedeep';
import {getFeeRatePerKb} from '../../../store/wallet/effects/fee/fee';
import {getSendMaxInfo} from '../../../store/wallet/effects/send/send';
import {SendMaxInfo, Wallet} from '../../../store/wallet/wallet.models';
import {
  addTokenChainSuffix,
  getCurrencyAbbreviation,
} from '../../../utils/helper-methods';
import {t} from 'i18next';

export const getExternalServiceSymbol = (
  coin: string,
  chain: string,
): string => {
  const _coin = cloneDeep(coin).toLowerCase();
  const _chain = cloneDeep(chain).toLowerCase();
  let symbol: string = _coin;

  if (_coin === 'eth' && ['arb', 'base', 'op'].includes(_chain)) {
    symbol = addTokenChainSuffix(_coin, _chain);
  } else {
    symbol = getCurrencyAbbreviation(_coin, _chain);
  }

  return symbol;
};

export const getSendMaxData = (
  wallet: Wallet,
): Promise<SendMaxInfo | undefined> => {
  return new Promise(async (resolve, reject) => {
    if (!wallet) {
      return resolve(undefined);
    }
    try {
      const feeLevel = ['btc', 'eth', 'matic'].includes(wallet.chain)
        ? 'priority'
        : 'normal';

      const feeRate = await getFeeRatePerKb({
        wallet,
        feeLevel,
      });

      const res = await getSendMaxInfo({
        wallet: wallet,
        opts: {
          feePerKb: feeRate,
          excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
          returnInputs: true,
        },
      });
      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
};

export const externalServicesCoinMapping = (coin: string): string => {
  if (coin === 'MATIC') {
    return 'POL';
  }

  const _coin = cloneDeep(coin).toLowerCase();
  if (_coin === 'matic') {
    return 'pol';
  }
  return coin;
};

export const getErrorMessage = (err: any): string => {
  const defaultMsg = t('Could not get crypto offer. Please try again later.');

  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;

  if (typeof err?.error?.error === 'string') return err.error.error;
  if (!err.message) {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
  }
  if (typeof err?.response?.data?.message === 'string')
    return err.response.data.message;
  if (typeof err?.message === 'string') return err.message;

  return defaultMsg;
};
