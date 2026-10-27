import {ethers} from 'ethers';
import {t} from 'i18next';
import {Effect} from '../../..';
import {logManager} from '../../../../managers/LogManager';
import {GetPrecision} from '../../utils/currency';
import {formatCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {SendMaxInfo, Wallet} from '../../wallet.models';
import {GetMinFee} from '../fee/fee';
const LOW_AMOUNT_RATIO = 0.15;
const TOTAL_LOW_WARNING_RATIO = 0.3;
import {GetUtxos} from '../transactions/transactions';

export interface FormattedAmountObj {
  amount: string;
  currency: string;
  amountSat: string;
  amountUnitStr: string;
}

export const parseAmountToStringIfBN = (amount: number | string) => {
  if (typeof amount === 'string') {
    return amount;
  }
  return amount.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
};

const isValidUnitDecimals = (unitDecimals: unknown): unitDecimals is number =>
  Number.isInteger(unitDecimals) &&
  Number(unitDecimals) >= 0 &&
  Number(unitDecimals) <= 256;

export const ToBaseUnits = (
  amount: number | string,
  unitDecimals: number,
): string => {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (!isValidUnitDecimals(unitDecimals)) {
    return 'NaN';
  }
  if (value === 0) {
    return '0';
  }
  const decimalPattern = /^([-+]?)(\d*)\.?(\d*)(?:e([-+]?\d+))?$/i;
  const [, sign, whole, fraction, exponent = '0'] =
    decimalPattern.exec(String(amount).trim()) ??
    decimalPattern.exec(String(value))!;
  const digits = `${whole}${fraction}`;
  const point = whole.length + Number(exponent) + unitDecimals;
  const truncated = BigInt(
    `0${digits.slice(0, Math.max(point, 0)).padEnd(point, '0')}`,
  );
  const rounded = digits.charAt(point) >= '5' ? truncated + 1n : truncated;
  return (sign === '-' ? -rounded : rounded).toString();
};

export const FromBaseUnits =
  (
    amount: number | string,
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<string> =>
  dispatch => {
    const value = Number(amount);
    if (!Number.isFinite(value)) {
      return String(value);
    }
    const unitDecimals = dispatch(
      GetPrecision(currencyAbbreviation, chain, tokenAddress),
    )?.unitDecimals;
    if (!isValidUnitDecimals(unitDecimals)) {
      return 'NaN';
    }
    const normalized = String(amount).trim().toLowerCase();
    const baseUnits = /^0x[0-9a-f]+$/.test(normalized)
      ? normalized
      : ToBaseUnits(amount, 0);
    return ethers.utils
      .formatUnits(baseUnits, unitDecimals)
      .replace(/\.0$/, '');
  };

export const ParseAmount =
  (
    amount: number | string,
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
    fullPrecision?: boolean,
  ): Effect<FormattedAmountObj> =>
  dispatch => {
    const precision = dispatch(
      GetPrecision(currencyAbbreviation, chain, tokenAddress),
    );
    if (!precision) {
      logManager.warn(
        `ParseAmount: no precision found for currency "${currencyAbbreviation}" on chain "${chain}" — returning zero fallback`,
      );
      return {
        amount: '0',
        currency: currencyAbbreviation,
        amountSat: '0',
        amountUnitStr: '',
      };
    }
    const {unitDecimals} = precision;
    let amountUnitStr;
    let amountSat;
    let _amount;
    amountSat = ToBaseUnits(amount, unitDecimals);
    amountUnitStr =
      dispatch(
        FormatAmountStr(
          currencyAbbreviation,
          chain,
          tokenAddress,
          amountSat,
          fullPrecision,
        ),
      ) || '';

    const [whole, fraction = ''] = dispatch(
      FromBaseUnits(amountSat, currencyAbbreviation, chain, tokenAddress),
    ).split('.');
    const paddedFraction = fraction.padEnd(
      Math.min(countDecimals(amount), unitDecimals),
      '0',
    );
    _amount = paddedFraction ? `${whole}.${paddedFraction}` : whole;

    const currency = formatCurrencyAbbreviation(currencyAbbreviation);

    return {
      amount: _amount,
      currency,
      amountSat,
      amountUnitStr,
    };
  };

const countDecimals = (num: number | string): number => {
  if (!num) {
    return 0;
  }
  const strNum = String(num);
  // verify if number 0.000005 is represented as "5e-6"
  if (strNum.indexOf('e-') > -1) {
    const [_base, trail] = strNum.split('e-');
    const deg = parseInt(trail, 10);
    return deg;
  }
  // count decimals for number in representation like "0.123456"
  if (Math.floor(Number(num)) !== Number(num)) {
    return strNum.split('.')?.[1]?.length || 0;
  }
  return 0;
};

export const FormatAmountStr =
  (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
    satoshis: number | string,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    if (isNaN(Number(satoshis))) {
      throw Error('Nan');
    }

    try {
      return (
        dispatch(
          FormatAmount(
            currencyAbbreviation,
            chain,
            tokenAddress,
            satoshis,
            fullPrecision,
          ),
        ) +
        ' ' +
        formatCurrencyAbbreviation(currencyAbbreviation)
      );
    } catch (e) {
      throw e;
    }
  };

export const FormatAmount =
  (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
    satoshis: number | string,
    fullPrecision?: boolean,
  ): Effect<string> =>
  dispatch => {
    const amount = dispatch(
      FromBaseUnits(satoshis, currencyAbbreviation, chain, tokenAddress),
    );
    if (!Number.isFinite(Number(amount))) {
      return amount;
    }
    const [whole, fraction = ''] = amount.split('.');
    const decimals = fullPrecision
      ? fraction
      : fraction.slice(0, 6).replace(/0+$/, '');
    const shownWhole = whole === '-0' && !decimals ? '0' : whole;
    return `${ethers.utils.commify(shownWhole)}.${decimals.padEnd(2, '0')}`;
  };

export const SatToUnit =
  (
    amount: number,
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<number | undefined> =>
  dispatch => {
    const {unitToSatoshi, unitDecimals} =
      dispatch(GetPrecision(currencyAbbreviation, chain, tokenAddress)) || {};
    let spendableAmount: number | undefined;
    if (unitToSatoshi && unitDecimals) {
      const satToUnit = 1 / unitToSatoshi;

      spendableAmount = parseFloat((amount * satToUnit).toFixed(unitDecimals));
    }
    return spendableAmount;
  };

export const GetExcludedUtxosMessage =
  (
    coin: string,
    chain: string,
    tokenAddress: string | undefined,
    sendMaxInfo: SendMaxInfo,
  ): Effect<string> =>
  dispatch => {
    const warningMsg = [];
    if (sendMaxInfo.utxosBelowFee > 0) {
      const amountBelowFeeStr = dispatch(
        SatToUnit(sendMaxInfo.amountBelowFee, coin, chain, tokenAddress),
      );
      const message = t(
        'A total of were excluded. These funds come from UTXOs smaller than the network fee provided',
        {amountBelowFeeStr, currencyAbbreviation: coin.toUpperCase()},
      );
      warningMsg.push(message);
    }

    if (sendMaxInfo.utxosAboveMaxSize > 0) {
      const amountAboveMaxSizeStr = dispatch(
        SatToUnit(sendMaxInfo.amountAboveMaxSize, coin, chain, tokenAddress),
      );
      const message = t(
        'A total of were excluded. The maximum size allowed for a transaction was exceeded.',
        {amountAboveMaxSizeStr, currencyAbbreviation: coin.toUpperCase()},
      );
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
