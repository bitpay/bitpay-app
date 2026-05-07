import type {SupportedCurrencyOption} from '../../../constants/SupportedCurrencyOptions';
import type {
  FiatRateSeriesCache,
  Rate,
  Rates,
} from '../../../store/rate/rate.models';
import {
  calculatePercentageDifference,
  getCurrencyAbbreviation,
  getLastDayTimestampStartOfHourMs,
} from '../../../utils/helper-methods';
import {findSupportedCurrencyOptionForAsset} from '../../../utils/portfolio/assets';
import {getAssetCurrentDisplayQuoteRate} from '../../../utils/portfolio/displayCurrency';
import {getFiatRateFromSeriesCacheAtTimestamp} from '../../../utils/portfolio/rate';
import {getCoinAndChainFromCurrencyCode} from '../../bitpay-id/utils/bitpay-id-utils';
import type {ExchangeRateItemProps} from './components/exchange-rates/ExchangeRatesList';

export function buildHomeExchangeRateItems(args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  lastDayRates: Rates;
  rates: Rates;
  quoteCurrency: string;
  baselineTimestampMs?: number;
  exchangeRateCurrencies: string[];
  supportedCurrencyOptions: SupportedCurrencyOption[];
  isStableCoinCurrencyName: (currencyName: string) => boolean;
}): Array<ExchangeRateItemProps> {
  const quoteCurrency = String(args.quoteCurrency || 'USD').toUpperCase();
  const baselineTimestampMs =
    typeof args.baselineTimestampMs === 'number' &&
    Number.isFinite(args.baselineTimestampMs)
      ? args.baselineTimestampMs
      : getLastDayTimestampStartOfHourMs();
  const result = (
    Object.entries(args.lastDayRates || {}) as Array<[string, Rate[]]>
  ).reduce((ratesList, [key, lastDayRate]) => {
    const lastDayRateForDefaultCurrency = (lastDayRate || []).find(
      ({code}: {code: string}) =>
        String(code || '').toUpperCase() === quoteCurrency,
    );
    const {coin: targetCoin, chain: targetChain} =
      getCoinAndChainFromCurrencyCode(key);
    const option = findSupportedCurrencyOptionForAsset({
      options: args.supportedCurrencyOptions,
      currencyAbbreviation: targetCoin,
      chain: targetChain,
    });

    if (!(option && option.chain && option.currencyAbbreviation)) {
      return ratesList;
    }

    const currencyName = getCurrencyAbbreviation(
      option.tokenAddress ? option.tokenAddress : option.currencyAbbreviation,
      option.chain,
    );

    if (
      args.isStableCoinCurrencyName(currencyName) ||
      !args.exchangeRateCurrencies.includes(
        option.currencyAbbreviation.toLowerCase(),
      )
    ) {
      return ratesList;
    }

    const currentRate = getAssetCurrentDisplayQuoteRate({
      rates: args.rates,
      currencyAbbreviation: option.currencyAbbreviation,
      chain: option.chain,
      tokenAddress: option.tokenAddress,
      quoteCurrency,
    });

    if (
      !(
        typeof currentRate === 'number' &&
        Number.isFinite(currentRate) &&
        currentRate > 0
      )
    ) {
      return ratesList;
    }

    const prevRateFromSeries = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      fiatCode: quoteCurrency,
      currencyAbbreviation: option.currencyAbbreviation,
      interval: '1D',
      timestampMs: baselineTimestampMs,
      method: 'linear',
      identity: {
        chain: option.tokenAddress ? option.chain : undefined,
        tokenAddress: option.tokenAddress,
      },
    });
    const prevRate = prevRateFromSeries ?? lastDayRateForDefaultCurrency?.rate;

    if (!(prevRate && prevRate > 0)) {
      return ratesList;
    }

    ratesList.push({
      id: option.id,
      img: option.img,
      currencyName: option.currencyName,
      currencyAbbreviation: option.currencyAbbreviation,
      chain: option.chain,
      tokenAddress: option.tokenAddress,
      average: calculatePercentageDifference(currentRate, prevRate),
      currentPrice: currentRate,
    });

    return ratesList;
  }, [] as Array<ExchangeRateItemProps>);

  return result.sort((a, b) => {
    const indexA = args.exchangeRateCurrencies.indexOf(
      a.currencyAbbreviation.toLowerCase(),
    );
    const indexB = args.exchangeRateCurrencies.indexOf(
      b.currencyAbbreviation.toLowerCase(),
    );

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) {
      return -1;
    }
    if (indexB !== -1) {
      return 1;
    }
    return a.currencyName.localeCompare(b.currencyName);
  });
}

export default buildHomeExchangeRateItems;
