import type {
  FiatRateChangeForTimeframe,
  FiatRateInterval,
  FiatRateSeriesCache,
  FiatRateSeriesReaderIdentity,
} from '../../../store/rate/rate.models';
import {getFiatRateChangeForTimeframe} from '../../../utils/portfolio/rate';

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
