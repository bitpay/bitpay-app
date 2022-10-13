import {Effect} from '../../..';
import {BwcProvider} from '../../../../lib/bwc';
import {GetPrecision, IsCustomERCToken} from '../../utils/currency';
import {SendMaxInfo, Wallet} from '../../wallet.models';
import {GetMinFee} from '../fee/fee';
const LOW_AMOUNT_RATIO = 0.15;
const TOTAL_LOW_WARNING_RATIO = 0.3;
import {GetUtxos} from '../transactions/transactions';

export interface FormattedAmountObj {
  amount: number;
  currency: string;
  amountSat: number | string;
  amountUnitStr: string;
}

export const ParseAmount =
  (
    amount: number,
    currencyAbbreviation: string,
    chain: string,
    fullPrecision?: boolean,
  ): Effect<FormattedAmountObj> =>
  dispatch => {
    const {unitDecimals} =
      dispatch(GetPrecision(currencyAbbreviation, chain)) || {};

    const _amount = amount * 10 ** (unitDecimals || 0);
    const amountSat = _amount.toLocaleString('fullwide', {
      useGrouping: false,
      maximumFractionDigits: 0,
    });

    const amountUnitStr =
      dispatch(
        FormatAmountStr(currencyAbbreviation, chain, _amount, fullPrecision),
      ) || '';

    const currency = currencyAbbreviation.toUpperCase();

    return {
      amount: _amount,
      currency,
      amountSat: (unitDecimals || 0) >= 18 ? amountSat : _amount,
      amountUnitStr,
    };
  };

export const FormatAmountStr =
  (
    currencyAbbreviation: string,
    chain: string,
    satoshis: number,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    try {
      return (
        dispatch(
          FormatAmount(currencyAbbreviation, chain, satoshis, fullPrecision),
        ) +
        ' ' +
        currencyAbbreviation.toUpperCase()
      );
    } catch (e) {
      throw e;
    }
  };

export const FormatAmount =
  (
    currencyAbbreviation: string,
    chain: string,
    satoshis: number,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    // TODO : now only works for english, specify opts to change thousand separator and decimal separator
    let opts: any = {
      fullPrecision: !!fullPrecision,
    };

    if (currencyAbbreviation && IsCustomERCToken(currencyAbbreviation, chain)) {
      const {unitToSatoshi, unitDecimals} =
        dispatch(GetPrecision(currencyAbbreviation, chain)) || {};
      if (unitToSatoshi) {
        opts.toSatoshis = unitToSatoshi;
      }
      opts.decimals = {
        full: {
          maxDecimals: unitDecimals || 8,
          minDecimals: unitDecimals || 8,
        },
        short: {
          maxDecimals: 6,
          minDecimals: 2,
        },
      };
    }

    return BwcProvider.getInstance()
      .getUtils()
      .formatAmount(satoshis, currencyAbbreviation.toLowerCase(), opts); // This util returns a string
  };

export const SatToUnit =
  (
    amount: number,
    currencyAbbreviation: string,
    chain: string,
  ): Effect<number | undefined> =>
  dispatch => {
    const {unitToSatoshi, unitDecimals} =
      dispatch(GetPrecision(currencyAbbreviation, chain)) || {};
    let spendableAmount: number | undefined;
    if (unitToSatoshi && unitDecimals) {
      const satToUnit = 1 / unitToSatoshi;

      spendableAmount = parseFloat((amount * satToUnit).toFixed(unitDecimals));
    }
    return spendableAmount;
  };

export const GetExcludedUtxosMessage =
  (coin: string, chain: string, sendMaxInfo: SendMaxInfo): Effect<string> =>
  dispatch => {
    const warningMsg = [];
    if (sendMaxInfo.utxosBelowFee > 0) {
      const amountBelowFeeStr = dispatch(
        SatToUnit(sendMaxInfo.amountBelowFee, coin, chain),
      );
      const message = `A total of ${amountBelowFeeStr} ${coin.toUpperCase()} were excluded. These funds come from UTXOs smaller than the network fee provided.`;
      warningMsg.push(message);
    }

    if (sendMaxInfo.utxosAboveMaxSize > 0) {
      const amountAboveMaxSizeStr = dispatch(
        SatToUnit(sendMaxInfo.amountAboveMaxSize, coin, chain),
      );
      const message = `A total of ${amountAboveMaxSizeStr} ${coin.toUpperCase()} were excluded. The maximum size allowed for a transaction was exceeded.`;
      warningMsg.push(message);
    }
    return warningMsg.join('\n');
  };

// Approx utxo amount, from which the uxto is economically redeemable
export const GetLowAmount = (wallet: Wallet): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const minFee: number = await GetMinFee(wallet);
      return resolve(minFee / LOW_AMOUNT_RATIO);
    } catch (err) {
      return reject(err);
    }
  });
};

export const GetLowUtxos = (wallet: Wallet): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await GetUtxos(wallet);
      const minFee = await GetMinFee(wallet, resp.length);
      const balance = resp.reduce(
        (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
        0,
      );

      const lowAmount = await GetLowAmount(wallet);
      const lowUtxos = resp.filter((x: any) => {
        return x.satoshis < lowAmount;
      });

      const totalLow = lowUtxos.reduce(
        (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
        0,
      );
      return resolve({
        allUtxos: resp || [],
        lowUtxos: lowUtxos || [],
        totalLow,
        warning: minFee / balance > TOTAL_LOW_WARNING_RATIO,
        minFee,
      });
    } catch (err) {
      return reject(err);
    }
  });
};
