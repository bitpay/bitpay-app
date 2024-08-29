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
