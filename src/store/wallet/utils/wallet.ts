import {Key, KeyMethods, Token, Wallet, WalletObj} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {Currencies, SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj = (
  {
    walletId,
    walletName,
    coin,
    balance = 0,
    tokens,
    keyId,
  }: Credentials & {
    balance?: number;
    tokens?: any;
  },
  tokenOpts: {[key in string]: Token},
  otherOpts?: {
    walletName?: string;
  },
): WalletObj => {
  return {
    id: walletId,
    currencyName: walletName,
    currencyAbbreviation: coin,
    walletName: otherOpts?.walletName,
    balance,
    tokens,
    keyId,
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
    keyName: 'My Key',
  };
};

export const GetProtocolPrefix = (
  currency: string,
  network: string = 'livenet',
) => {
  // @ts-ignore
  return Currencies[currency].paymentInfo.protocolPrefix[network];
};

const GetPrecision = (currencyAbbreviation: string) => {
  return Currencies[currencyAbbreviation].unitInfo;
};

export const IsUtxoCoin = (currencyAbbreviation: string): boolean => {
  return Currencies[currencyAbbreviation].properties.isUtxo;
};

export const FormatCryptoAmount = (
  amount: number,
  currencyAbbreviation: string,
) => {
  //TODO: format amount
  return amount;
};
