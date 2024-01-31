export interface ZenledgerCredentialsProps {
  client_id: string;
  client_secret: string;
  grant_type: string;
  token_endpoint: string;
}

export interface ZenledgerTokenProps {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}

interface ZenledgerSourceItemProps {
  reference: string;
  name: string;
  type: string;
  api: boolean;
  csv: boolean;
  oauth: boolean;
  address: boolean;
  pass_phrase: boolean;
  default_coin: string;
}

export interface ZenledgerSourceResponse {
  sources: ZenledgerSourceItemProps[];
  meta: {
    current_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ZenledgerCurrenciesItemProps {
  reference: string;
  name: string;
  symbol: string;
  blockchains:
    | [
        {
          platform: string;
          contract: string;
        },
      ]
    | [];
}

export interface ZenledgerCurrenciesResponse {
  sources: ZenledgerCurrenciesItemProps[];
  meta: {
    current_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ZenledgerTaxesResponse {
  status: string;
  capital_gains?: {
    long_term: {
      gain: number;
      proceeds: number;
      cost_basis: number;
    };
    short_term: {
      gain: number;
      proceeds: number;
      cost_basis: number;
    };
  };
}

export interface ZenledgerPortfolioProps {
  blockchain: string;
  coin: string;
  address: string;
  display_name: string;
}

export interface ZenledgerPortfolioResponseProps {
  signup_url: string;
  aggcode: string;
}
