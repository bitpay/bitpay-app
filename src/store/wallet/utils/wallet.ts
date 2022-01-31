import {Key, KeyMethods, Token, Wallet, WalletObj} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
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
  return {
    id: walletId,
    currencyName: walletName,
    currencyAbbreviation: coin,
    balance,
    tokens,
    img: SUPPORTED_CURRENCIES.includes(coin)
      ? CurrencyListIcons[coin]
      : tokenOpts[coin]?.logoURI,
  };
};

// Formatted key Obj
export const buildKeyObj = ({
  key,
  wallets,
  totalBalance = 0,
}: {
  key: KeyMethods;
  wallets: Wallet[];
  totalBalance?: number;
}): Key => {
  return {
    id: key.id,
    wallets,
    properties: key.toObj(),
    methods: key,
    totalBalance,
    show: true,
    isPrivKeyEncrypted: key.isPrivKeyEncrypted(),
    keyName: 'My Key'
  };
};
