import {Effect} from '../../..';
import {BwcProvider} from '../../../../lib/bwc';
import {GetPrecision, IsCustomERCToken} from '../../utils/currency';
import {SendMaxInfo, Wallet} from '../../wallet.models';
import {GetMinFee} from '../fee/fee';
const LOW_AMOUNT_RATIO = 0.15;
const TOTAL_LOW_WARNING_RATIO = 0.3;
import {GetUtxos} from '../transactions/transactions';

export interface FormattedAmountObj {
  amount: string;
  currency: string;
  amountSat: number;
  amountUnitStr: string;
}

export const ParseAmount =
  (
    amount: number,
    currencyAbbreviation: string,
    fullPrecision?: boolean,
  ): Effect<FormattedAmountObj> =>
  dispatch => {
    // @ts-ignore
    const {unitToSatoshi, unitDecimals} = dispatch(
      GetPrecision(currencyAbbreviation),
    );
    const satToUnit = 1 / unitToSatoshi;
    let amountUnitStr;
    let amountSat;
    let _amount;
    amountSat = Number((amount * unitToSatoshi).toFixed(0));
    amountUnitStr =
      dispatch(
        FormatAmountStr(currencyAbbreviation, amountSat, fullPrecision),
      ) || '';

    _amount = (amountSat * satToUnit).toFixed(unitDecimals);
    const currency = currencyAbbreviation.toUpperCase();

    return {
      amount: _amount,
      currency,
      amountSat,
      amountUnitStr,
    };
  };

export const FormatAmountStr =
  (
    currencyAbbreviation: string,
    satoshis: number,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    if (isNaN(satoshis)) {
      throw Error('Nan');
    }

    try {
      return (
        dispatch(FormatAmount(currencyAbbreviation, satoshis, fullPrecision)) +
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
    satoshis: number,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    // TODO : now only works for english, specify opts to change thousand separator and decimal separator
    let opts: any = {
      fullPrecision: !!fullPrecision,
    };

    if (currencyAbbreviation && IsCustomERCToken(currencyAbbreviation)) {
      opts.toSatoshis = dispatch(
        GetPrecision(currencyAbbreviation),
      )?.unitToSatoshi;
      opts.decimals = {
        full: {
          maxDecimals: 8,
          minDecimals: 8,
        },
        short: {
          maxDecimals: 6,
          minDecimals: 2,
        },
      };
    }

    return BwcProvider.getInstance()
      .getUtils()
      .formatAmount(satoshis, currencyAbbreviation, opts); // This util returns a string
  };

export const SatToUnit =
  (amount: number, currencyAbbreviation: string): Effect<number | undefined> =>
  dispatch => {
    const {unitToSatoshi, unitDecimals} =
      dispatch(GetPrecision(currencyAbbreviation.toLowerCase())) || {};
    let spendableAmount: number | undefined;
    if (unitToSatoshi && unitDecimals) {
      const satToUnit = 1 / unitToSatoshi;

      spendableAmount = parseFloat((amount * satToUnit).toFixed(unitDecimals));
    }
    return spendableAmount;
  };

export const GetExcludedUtxosMessage =
  (coin: string, sendMaxInfo: SendMaxInfo): Effect<string> =>
  dispatch => {
    const warningMsg = [];
    if (sendMaxInfo.utxosBelowFee > 0) {
      const amountBelowFeeStr = dispatch(
        SatToUnit(sendMaxInfo.amountBelowFee, coin),
      );
      const message = `A total of ${amountBelowFeeStr} ${coin.toUpperCase()} were excluded. These funds come from UTXOs smaller than the network fee provided.`;
      warningMsg.push(message);
    }

    if (sendMaxInfo.utxosAboveMaxSize > 0) {
      const amountAboveMaxSizeStr = dispatch(
        SatToUnit(sendMaxInfo.amountAboveMaxSize, coin),
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
