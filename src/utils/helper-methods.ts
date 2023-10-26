import {SUPPORTED_COINS} from '../constants/currencies';
import {Key} from '../store/wallet/wallet.models';
import {ContactRowProps} from '../components/list/ContactRow';
import {Network} from '../constants';
import {CurrencyListIcons} from '../constants/SupportedCurrencyOptions';
import {ReactElement} from 'react';
import {IsERCToken} from '../store/wallet/utils/currency';
import {Rate, Rates} from '../store/rate/rate.models';
import {PROTOCOL_NAME} from '../constants/config';

export const sleep = (duration: number) =>
  new Promise<void>(resolve => setTimeout(resolve, duration));

export const titleCasing = (str: string) =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

export const parsePath = (path: string) => {
  return {
    purpose: path.split('/')[1],
    coinCode: path.split('/')[2],
    account: path.split('/')[3],
  };
};

export const getDerivationStrategy = (path: string): string => {
  const purpose = parsePath(path).purpose;
  let derivationStrategy: string = '';

  switch (purpose) {
    case "44'":
      derivationStrategy = 'BIP44';
      break;
    case "45'":
      derivationStrategy = 'BIP45';
      break;
    case "48'":
      derivationStrategy = 'BIP48';
      break;
  }
  return derivationStrategy;
};

export const getNetworkName = (path: string): string => {
  // BIP45
  const purpose = parsePath(path).purpose;
  if (purpose === "45'") {
    return 'livenet';
  }

  const coinCode = parsePath(path).coinCode;
  let networkName: string = '';

  switch (coinCode) {
    case "0'": // for BTC
      networkName = 'livenet';
      break;
    case "1'": // testnet for all coins
      networkName = 'testnet';
      break;
    case "145'": // for BCH
      networkName = 'livenet';
      break;
    case "60'": // for ETH
      networkName = 'livenet';
      break;
    case "144'": // for XRP
      networkName = 'livenet';
      break;
    case "3'": // for DOGE
      networkName = 'livenet';
      break;
    case "2'": // for LTC
      networkName = 'livenet';
      break;
  }
  return networkName;
};

export const getAccount = (path: string): number | undefined => {
  // BIP45
  const purpose = parsePath(path).purpose;
  if (purpose === "45'") {
    return 0;
  }

  const account = parsePath(path).account || '';
  const match = account.match(/(\d+)'/);
  if (!match) {
    return undefined;
  }
  return +match[1];
};

export const isValidDerivationPathCoin = (
  path: string,
  coin: string,
): boolean => {
  let isValid: boolean = false;
  const coinCode = parsePath(path).coinCode;

  // BIP45
  if (path === "m/45'") {
    return true;
  }

  switch (coin) {
    case 'btc':
      isValid = ["0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'bch':
      isValid = ["145'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'eth':
    case 'matic':
      isValid = ["60'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'xrp':
      isValid = ["144'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'doge':
      isValid = ["3'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'ltc':
      isValid = ["2'", "1'"].indexOf(coinCode) > -1;
      break;
  }

  return isValid;
};

export const keyExtractor = (item: {id: string}) => item.id;

export const getSignificantDigits = (currencyAbbreviation?: string) => {
  return currencyAbbreviation &&
    ['doge', 'xrp', 'shib', 'elon', 'prt', 'rfox', 'rfuel', 'xyo'].includes(
      currencyAbbreviation.toLowerCase(),
    )
    ? 4
    : undefined;
};

const getFormatter = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
) =>
  new Intl.NumberFormat('en-US', {
    minimumSignificantDigits:
      amount === 0
        ? undefined
        : getSignificantDigits(opts.currencyAbbreviation),
    maximumSignificantDigits:
      amount === 0
        ? undefined
        : getSignificantDigits(opts.currencyAbbreviation),
    style: 'currency',
    currency: currency.toLowerCase(),
    ...(opts.customPrecision === 'minimal' &&
      Number.isInteger(amount) && {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
    currencyDisplay: opts.currencyDisplay,
  });

export const formatFiatAmount = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
) => {
  const currencyDisplay = opts.currencyDisplay || 'symbol';
  const formatter = getFormatter(amount, currency, {...opts, currencyDisplay});

  if (currencyDisplay === 'symbol') {
    return formatter.format(amount);
  }

  let code;
  let numberString = formatter
    .formatToParts(amount)
    .map(({type, value}) => {
      switch (type) {
        case 'currency':
          code = value;
          return '';
        default:
          return value;
      }
    })
    .reduce((string, part) => string + part);
  return `${numberString} ${code}`;
};

export const findContact = (
  contactList: ContactRowProps[],
  address: string,
  coin: string,
  network: string,
  chain: string,
  tokenAddress: string | undefined,
) => {
  const foundContacts = contactList.filter((contact: ContactRowProps) => {
    return contact.address === address &&
      contact.coin === coin &&
      contact.network === network &&
      contact.chain === chain &&
      contact.tokenAddress
      ? contact.tokenAddress === tokenAddress
      : true;
  });
  return !!foundContacts.length;
};

export const getContactObj = (
  contactList: ContactRowProps[],
  address: string,
  coin: string,
  network: string,
  chain: string,
) => {
  const contactObj = contactList.find((contact: ContactRowProps) => {
    return (
      contact.address === address &&
      contact.coin === coin &&
      contact.network === network &&
      contact.chain === chain
    );
  });
  return contactObj;
};

export const getMnemonic = (key: Key) =>
  key.properties!.mnemonic.trim().split(' ');

export const shouldScale = (
  value: string | number | null | undefined,
  threshold = 10,
): boolean => {
  if (!value) {
    return false;
  }
  // un-formatted fiat
  if (typeof value === 'number') {
    value = Number(value).toFixed(2);
  }
  return value.length > threshold;
};

export const formatCryptoAddress = (address: string) => {
  return (
    address.substring(0, 4) + '....' + address.substring(address.length - 4)
  );
};

export const calculatePercentageDifference = (
  currentBalance: number,
  lastDayBalance: number,
): number => {
  return Number(
    (((currentBalance - lastDayBalance) * 100) / lastDayBalance).toFixed(2),
  );
};

export const formatFiatAmountObj = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
): {amount: string; code?: string} => {
  const currencyDisplay = opts.currencyDisplay || 'symbol';
  const formatter = getFormatter(amount, currency, {...opts, currencyDisplay});

  if (currencyDisplay === 'symbol') {
    return {amount: formatter.format(amount)};
  }

  let code;
  let numberString = formatter
    .formatToParts(amount)
    .map(({type, value}) => {
      switch (type) {
        case 'currency':
          code = value;
          return '';
        default:
          return value;
      }
    })
    .reduce((string, part) => string + part);
  return {amount: numberString, code};
};

export const convertToFiat = (
  fiat: number,
  hideWallet: boolean | undefined,
  network: Network,
) => (network === Network.mainnet && !hideWallet ? fiat : 0);

export const getErrorString = (err: any): string => {
  return err instanceof Error ? err.message : JSON.stringify(err);
};

export const getBadgeImg = (
  currencyAbbreviation: string,
  chain: string,
): string | ((props?: any) => ReactElement) => {
  return !SUPPORTED_COINS.includes(currencyAbbreviation)
    ? CurrencyListIcons[chain]
    : '';
};

export const getRateByCurrencyName = (
  rates: Rates,
  currencyAbbreviation: string,
  chain: string,
): Rate[] => {
  const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);
  return rates[currencyName];
};

export const addTokenChainSuffix = (name: string, chain: string) => {
  return `${name.toLowerCase()}_${chain.charAt(0)}`;
};

export const getCurrencyAbbreviation = (name: string, chain: string) => {
  return IsERCToken(name.toLowerCase(), chain.toLowerCase())
    ? addTokenChainSuffix(name, chain)
    : name.toLowerCase();
};

export const getProtocolName = (
  chain: string,
  network: string,
): string | undefined => {
  const _chain = chain.toLowerCase();
  const _network = network.toLowerCase();
  return PROTOCOL_NAME[_chain]?.[_network]
    ? PROTOCOL_NAME[_chain][_network]
    : _network === 'testnet'
    ? PROTOCOL_NAME.default[_network]
    : undefined;
};

export const getCWCChain = (chain: string): string => {
  switch (chain.toLowerCase()) {
    case 'eth':
      return 'ETHERC20';
    case 'matic':
      return 'MATICERC20';

    default:
      return 'ETHERC20';
  }
};

export const getChainUsingSuffix = (symbol: string) => {
  const suffix = symbol.charAt(symbol.length - 1);
  switch (suffix) {
    case 'e':
      return 'eth';
    case 'm':
      return 'matic';
    default:
      return 'eth';
  }
};
