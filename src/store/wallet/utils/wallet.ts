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
import {
  Currencies,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TOKENS,
} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';
import {BALANCE_CACHE_DURATION} from '../../../constants/wallet';

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
    balance = {crypto: '0', fiat: 0},
    tokens,
    keyId,
  }: Credentials & {
    balance?: WalletBalance;
    tokens?: any;
  },
  tokenOpts: {[key in string]: Token},
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
      : tokenOpts[currencyAbbreviation]?.logoURI,
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

export const findWalletById = (wallets: Wallet[], id: string) =>
  wallets.find(wallet => wallet.id === id);

export const isBalanceCacheKeyStale = (timestamp: number | undefined) => {
  if (!timestamp) {
    return true;
  }

  const TTL = BALANCE_CACHE_DURATION * 1000;
  return Date.now() - timestamp > TTL;
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

const IsCustomERCToken = (currencyAbbreviation: string) => {
  return (
    Currencies[currencyAbbreviation]?.properties.isCustom &&
    !SUPPORTED_TOKENS.includes(currencyAbbreviation)
  );
};

export interface FormattedAmountObj {
  amount: string;
  currency: string;
  amountSat: number;
  amountUnitStr: string;
}

export const FormatCryptoAmount = (
  amount: number,
  currencyAbbreviation: string,
): FormattedAmountObj => {
  // @ts-ignore
  const {unitToSatoshi, unitDecimals} = GetPrecision(currencyAbbreviation);
  const satToUnit = 1 / unitToSatoshi;
  let amountUnitStr;
  let amountSat;
  let _amount;
  amountSat = parseInt((amount * unitToSatoshi).toFixed(0), 10);

  let opts;
  // Custom tokens
  if (currencyAbbreviation && IsCustomERCToken(currencyAbbreviation)) {
    opts = {
      // @ts-ignore
      toSatoshis: GetPrecision(currencyAbbreviation).unitToSatoshi,
      decimals: {
        full: {
          maxDecimals: 8,
          minDecimals: 8,
        },
        short: {
          maxDecimals: 6,
          minDecimals: 2,
        },
      },
    };
  }

  try {
    amountUnitStr = BwcProvider.getInstance()
      .getUtils()
      .formatAmount(amountSat, currencyAbbreviation, opts);
    amountUnitStr = `${amountUnitStr} ${currencyAbbreviation.toUpperCase()}`;
  } catch (e) {}

  _amount = (amountSat * satToUnit).toFixed(unitDecimals);
  const currency = currencyAbbreviation.toUpperCase();

  return {
    amount: _amount,
    currency,
    amountSat,
    amountUnitStr,
  };
};
