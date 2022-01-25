import {Token, WalletObj} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import merge from 'lodash.merge';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj = (
  {
    walletId,
    walletName,
    coin,
    balance = 0,
    tokens,
  }: Credentials & {
    balance?: number;
    tokens?: any;
  },
  tokenOpts: {[key in string]: Token},
): WalletObj => {
  return merge({
    id: walletId,
    currencyName: walletName,
    currencyAbbreviation: coin,
    balance,
    tokens,
    img: SUPPORTED_CURRENCIES.includes(coin)
      ? CurrencyListIcons[coin]
      : tokenOpts[coin]?.logoURI,
  });
};

