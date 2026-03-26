import type {
  FiatRateChangeForTimeframe,
  FiatRateInterval,
  FiatRateSeriesCache,
  FiatRateSeriesReaderIdentity,
} from '../../../store/rate/rate.models';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {getFiatRateChangeForTimeframe} from '../../../utils/portfolio/rate';

const MIN_TINY_VALUE = 0.01;
const MIN_TINY_FRACTION_DIGITS = 4;
const MAX_TINY_FRACTION_DIGITS = 8;
const MIN_TINY_DISPLAYABLE = 1 / Math.pow(10, MAX_TINY_FRACTION_DIGITS);

export const POLYGON_ABOUT_FALLBACK =
  'Polygon (Previously Matic Network) is the first well-structured, easy-to-use platform for Ethereum scaling and infrastructure development. Its core component is Polygon SDK, a modular, flexible framework that supports building multiple types of applications.\r\n\r\nUsing Polygon, one can create Optimistic Rollup chains, ZK Rollup chains, stand alone chains or any other kind of infra required by the developer. \r\n\r\nPolygon effectively transforms Ethereum into a full-fledged multi-chain system (aka Internet of Blockchains). This multi-chain system is akin to other ones such as Polkadot, Cosmos, Avalanche etc with the advantages of Ethereum’s security, vibrant ecosystem and openness.\r\n\r\nNothing will change for the existing ecosystem built on the Plasma-POS chain. With Polygon, new features are being built around the existing proven technology to expand the ability to cater to diverse needs from the developer ecosystem. Polygon will continue to develop the core technology so that it can scale to a larger ecosystem. \r\n\r\nThe $MATIC token will continue to exist and will play an increasingly important role, securing the system and enabling governance.';

const getCurrencySymbol = (isoCode: string): string => {
  try {
    const formatted = (0)
      .toLocaleString('en-US', {
        style: 'currency',
        currency: isoCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, '')
      .trim();
    return formatted || isoCode;
  } catch {
    return isoCode;
  }
};

const formatCompactNumber = (value: number, maximumFractionDigits = 2) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: Array<{threshold: number; suffix: string}> = [
    {threshold: 1e12, suffix: 'T'},
    {threshold: 1e9, suffix: 'B'},
    {threshold: 1e6, suffix: 'M'},
    {threshold: 1e3, suffix: 'K'},
  ];

  const unit = units.find(u => abs >= u.threshold);
  if (!unit) {
    const fixed = value.toFixed(Math.min(2, maximumFractionDigits));
    return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  }

  const scaled = abs / unit.threshold;
  const fixed = scaled.toFixed(maximumFractionDigits);
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  return `${sign}${trimmed}${unit.suffix}`;
};

const formatTinyDecimal = (value: number, decimals: number) => {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
};

export const formatCompactCurrency = (
  value: number,
  isoCode: string,
  maximumFractionDigits = 2,
) => {
  const absValue = Math.abs(value);
  const isoUpper = (isoCode || '').toUpperCase();
  const symbol = getCurrencySymbol(isoCode);
  const useSymbol = symbol !== isoCode;
  const compactThreshold = isoUpper === 'USD' ? 1e6 : 1e5;

  if (absValue < compactThreshold) {
    if (!absValue || absValue >= MIN_TINY_VALUE) {
      return formatFiatAmount(value, isoCode, {
        customPrecision: 'minimal',
        currencyDisplay: 'symbol',
      });
    }

    if (absValue < MIN_TINY_DISPLAYABLE) {
      const comparator = value < 0 ? '>' : '<';
      const thresholdString = `0.${'0'.repeat(MAX_TINY_FRACTION_DIGITS - 1)}1`;
      return useSymbol
        ? `${comparator}${symbol}${thresholdString}`
        : `${comparator}${thresholdString} ${isoCode}`;
    }

    const decimals = Math.min(
      MAX_TINY_FRACTION_DIGITS,
      Math.max(
        MIN_TINY_FRACTION_DIGITS,
        Math.ceil(Math.abs(Math.log10(absValue))) + 2,
      ),
    );
    const tinyNumber = formatTinyDecimal(absValue, decimals);
    const sign = value < 0 ? '-' : '';
    return useSymbol
      ? `${sign}${symbol}${tinyNumber}`
      : `${sign}${tinyNumber} ${isoCode}`;
  }

  const compact = formatCompactNumber(value, maximumFractionDigits);
  return useSymbol ? `${symbol}${compact}` : `${compact} ${isoCode}`;
};

export const formatSupply = (value: number, maximumFractionDigits = 2) => {
  if (value >= 1e9) {
    return formatCompactNumber(value, maximumFractionDigits);
  }
  const fixed = value.toFixed(maximumFractionDigits);
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  const [intPart, decPart] = trimmed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withCommas}.${decPart}` : withCommas;
};

export const getExchangeRateTimeframeChange = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  normalizedCoin: string;
  timeframe: FiatRateInterval;
  currentRate?: number;
  historicalRateIdentity?: FiatRateSeriesReaderIdentity;
  nowMs?: number;
}): FiatRateChangeForTimeframe | undefined => {
  if (!args.fiatCode || !args.normalizedCoin) {
    return undefined;
  }

  return getFiatRateChangeForTimeframe({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    fiatCode: args.fiatCode,
    currencyAbbreviation: args.normalizedCoin,
    timeframe: args.timeframe,
    currentRate: args.currentRate,
    identity: args.historicalRateIdentity,
    nowMs: args.nowMs,
    method: 'linear',
  });
};
