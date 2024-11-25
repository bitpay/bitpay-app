export interface SimplexGetCurrenciesRequestData {
  env: 'sandbox' | 'production';
}

export type SimplexCurrencyNetworks =
  | 'Arbitrum'
  | 'Base'
  | 'Bitcoin'
  | 'Bitcoin Cash'
  | 'Dogecoin'
  | 'Ethereum'
  | 'Litecoin'
  | 'Optimism'
  | 'Polygon'
  | 'Ripple';

export type SimplexCurrencyNetworkCode =
  | 'arbitrum'
  | 'base'
  | 'bitcoin'
  | 'bitcoin_cash'
  | 'dogecoin'
  | 'ethereum'
  | 'litecoin'
  | 'optimism'
  | 'polygon'
  | 'ripple';

export interface SimplexCurrency {
  name: string;
  ticker_symbol: string;
  'memo/tag_field': boolean;
  fixed_min_amount: number | null;
  networks: SimplexCurrencyNetworks[];
  network_code: SimplexCurrencyNetworkCode;
  contract_address: string | null;
}

export type SimplexGetCurrenciesData = SimplexCurrency[];
