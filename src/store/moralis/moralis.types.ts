export type MoralisErc20TokenBalanceByWalletData = {
  balance: string;
  decimals: number;
  logo?: string | undefined;
  name: string;
  percentage_relative_to_total_supply: number;
  possible_spam: boolean;
  symbol: string;
  thumbnail?: string | undefined;
  token_address: string;
  total_supply: string;
  total_supply_formatted: string;
  verified_contract?: boolean | undefined;
};

export type MoralisWalletApprovalsDataResultObject = {
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
  value: string;
  value_formatted: string;
  token: {
    address: string;
    address_label: string;
    name: string;
    symbol: string;
    logo: string;
    possible_spam: boolean;
    verified_contract: boolean;
    current_balance: string | null;
    current_balance_formatted: string | null;
    usd_price: string | null;
    usd_at_risk: string | null;
  };
  spender: {
    address: string;
    address_label?: string;
    entity?: string;
    entity_logo?: string;
  };
};

export type MoralisWalletApprovalsData = {
  limit: number;
  page_size: number;
  cursor: string | null;
  result: MoralisWalletApprovalsDataResultObject[];
};
