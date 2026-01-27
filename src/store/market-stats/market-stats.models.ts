export interface MarketStatsItem {
  symbol?: string;
  name?: string;
  image?: string;
  price?: number | null;
  high52w?: number | null;
  low52w?: number | null;
  volume24h?: number | null;
  circulatingSupply?: number | null;
  marketCap?: number | null;
  lastUpdated?: string;
  about?: string;
}

export interface MarketStatsState {
  itemsByKey: {
    [key in string]: MarketStatsItem | undefined;
  };
  lastFetchedByKey: {
    [key in string]: number | undefined;
  };
}
