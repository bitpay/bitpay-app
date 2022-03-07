import {
  Key,
  KeyMethods,
  Rates,
  Token,
  Wallet,
  WalletBalance,
  WalletObj,
} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {Currencies, SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';
import {BALANCE_CACHE_DURATION} from '../../../constants/wallet';
import {GetProtocolPrefix} from './currency';

const mapAbbreviationAndName = (
  walletName: string,
  coin: string,
): {currencyAbbreviation: string; currencyName: string} => {
  switch (coin) {
    case 'pax':
      return {
        currencyAbbreviation: 'usdp',
        currencyName: 'Pax Dollar',
      };
    default:
      return {
        currencyAbbreviation: coin,
        currencyName: walletName,
      };
  }
};

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj = (
  {
    walletId,
    walletName,
    coin,
    balance = {crypto: '0', fiat: 0, sat: 0},
    tokens,
    keyId,
    n,
    m,
  }: Credentials & {
    balance?: WalletBalance;
    tokens?: any;
  },
  tokenOpts?: {[key in string]: Token},
  otherOpts?: {
    walletName?: string;
  },
): WalletObj => {
  const {currencyName, currencyAbbreviation} = mapAbbreviationAndName(
    walletName,
    coin,
  );
  return {
    id: walletId,
    currencyName,
    currencyAbbreviation,
    walletName: otherOpts?.walletName,
    balance,
    tokens,
    keyId,
    img: SUPPORTED_CURRENCIES.includes(currencyAbbreviation)
      ? CurrencyListIcons[currencyAbbreviation]
      : tokenOpts
      ? tokenOpts[currencyAbbreviation]?.logoURI
      : '',
    n,
    m,
    isRefreshing: false,
  };
};

// Formatted key Obj
export const buildKeyObj = ({
  key,
  wallets,
  totalBalance = 0,
  backupComplete = false,
}: {
  key: KeyMethods;
  wallets: Wallet[];
  totalBalance?: number;
  backupComplete?: boolean;
}): Key => {
  return {
    id: key.id,
    wallets,
    properties: key.toObj(),
    methods: key,
    totalBalance,
    show: true,
    isPrivKeyEncrypted: key.isPrivKeyEncrypted(),
    backupComplete,
    keyName: 'My Key',
  };
};

export const formatCryptoAmount = (
  totalAmount: number,
  currencyAbbreviation: string,
): string => {
  return totalAmount
    ? BwcProvider.getInstance()
        .getUtils()
        .formatAmount(totalAmount, currencyAbbreviation)
    : '0';
};

export const toFiat = (
  totalAmount: number,
  fiatCode: string,
  currencyAbbreviation: string,
  rates: Rates = {},
  customRate?: number,
): number => {
  // TODO - remove when we add coin gecko for token rates
  if (!SUPPORTED_CURRENCIES.includes(currencyAbbreviation)) {
    return 0;
  }

  const ratesPerCurrency = rates[currencyAbbreviation];

  if (!ratesPerCurrency) {
    throw Error(`Rate not found for currency: ${currencyAbbreviation}`);
  }

  const fiatRate =
    customRate ||
    ratesPerCurrency.find(_currency => _currency.code === fiatCode)?.rate;

  if (!fiatRate) {
    throw Error(
      `Rate not found for fiat/currency pair: ${fiatCode} -> ${currencyAbbreviation}`,
    );
  }

  const currencyOpt = Currencies[currencyAbbreviation];

  if (!currencyOpt?.unitInfo) {
    throw Error(`unitInfo not found for currency ${currencyAbbreviation}`);
  }

  return totalAmount * (1 / currencyOpt.unitInfo.unitToSatoshi) * fiatRate;
};

export const findWalletById = (
  wallets: Wallet[],
  id: string,
): Wallet | undefined => wallets.find(wallet => wallet.id === id);

export const isCacheKeyStale = (
  timestamp: number | undefined,
  duration: number,
) => {
  if (!timestamp) {
    return true;
  }

  const TTL = duration * 1000;
  return Date.now() - timestamp > TTL;
};

export const checkEncryptPassword = (key: Key, password: string) =>
  key.methods.checkPassword(password);

export const generateKeyExportCode = (
  key: Key,
  getKeyMnemonic?: string | undefined,
): string => {
  return `1|${getKeyMnemonic}|null|null|${key.properties.mnemonic}|null`;
};

export const isSegwit = (addressType: string) => {
  if (!addressType) {
    return false;
  }

  return addressType == 'P2WPKH' || addressType == 'P2WSH';
};

export const GetProtocolPrefixAddress = (
  coin: string,
  network: string,
  address: string,
): string | undefined => {
  if (coin !== 'bch') {
    return address;
  }
  const proto: string = GetProtocolPrefix(coin, network);
  const protoAddr: string = proto + ':' + address;
  return protoAddr;
};
