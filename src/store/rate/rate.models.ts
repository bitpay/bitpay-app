export interface Rate {
  code: string;
  fetchedOn: number;
  name: string;
  rate: number;
  ts: number;
}

export interface HistoricRate {
  fetchedOn: number;
  rate: number;
  ts: number;
}

export type Rates = {
  [key in string]: Rate[];
};

export type RatesByDateRange = {
  [key in DateRanges]: Rate[];
};

export enum DateRanges {
  Day = 1,
  Week = 7,
  Month = 30,
}

export interface PriceHistory {
  coin: string;
  priceDisplay: Array<number>;
  percentChange: string;
  currencyPair: string;
  prices: Array<{price: number; time: string}>;
}

export enum CacheKeys {
  RATES = 'ratesCacheKey',
}
