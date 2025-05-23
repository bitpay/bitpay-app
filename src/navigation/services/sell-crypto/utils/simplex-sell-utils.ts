import {
  SimplexPayoutMethodType,
  SimplexSellOrderStatus,
} from '../../../../store/sell-crypto/models/simplex-sell.models';
import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {WithdrawalMethodKey} from '../constants/SellCryptoConstants';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {SimplexCurrencyNetworkCode} from '../../../../store/buy-crypto/models/simplex.models';
import {isEuCountry} from '../../../../store/location/location.effects';

const PASSTHROUGH_URI_DEV = 'https://cmgustavo.github.io/website/simplex/';
const PASSTHROUGH_URI_PROD = 'https://bws.bitpay.com/static/simplex/';

export const simplexSellEnv = __DEV__ ? 'sandbox' : 'production';

export const simplexSellSupportedFiatCurrencies = ['EUR'];

export const simplexSellSupportedCoins = ['btc'];

export const simplexSellSupportedErc20Tokens: string[] = [];
export const simplexSellSupportedMaticTokens: string[] = [];
export const simplexSellSupportedArbitrumTokens: string[] = [];
export const simplexSellSupportedBaseTokens: string[] = [];
export const simplexSellSupportedOptimismTokens: string[] = [];

export const simplexSellErc20TokensWithSuffix: string[] = [];
export const simplexSellMaticTokensWithSuffix: string[] = [];
export const simplexSellArbitrumTokensWithSuffix: string[] = [];
export const simplexSellBaseTokensWithSuffix: string[] = [];
export const simplexSellOptimismTokensWithSuffix: string[] = [];

export const getSimplexSellSupportedCurrencies = (
  locationCountry?: string,
  userCountry?: string,
): string[] => {
  const simplexSellSupportedCurrencies = [
    ...simplexSellSupportedCoins,
    ...simplexSellSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...simplexSellSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...simplexSellSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...simplexSellSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...simplexSellSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
  ];

  if (isEuCountry(locationCountry) || isEuCountry(userCountry)) {
    return simplexSellSupportedCurrencies;
  } else {
    return [];
  }
};

export const getSimplexCoinFormat = (coin: string, chain: string): string => {
  coin = externalServicesCoinMapping(coin);
  let formattedCoin: string = coin.toUpperCase();
  switch (chain) {
    case 'eth':
      if (simplexSellErc20TokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-ERC20`;
      }
      break;
    case 'matic':
      if (simplexSellMaticTokensWithSuffix.includes(coin.toLowerCase())) {
        switch (coin.toLowerCase()) {
          case 'eth':
            formattedCoin = 'WETH-POL';
            break;
          default:
            formattedCoin = `${coin.toUpperCase()}-POL`;
            break;
        }
      }
      break;
    case 'arb':
      if (simplexSellArbitrumTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-ARBITRUM`;
      }
      break;
    case 'base':
      if (simplexSellBaseTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-BASE`;
      }
      break;
    case 'op':
      if (simplexSellOptimismTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-OPTIMISM`;
      }
      break;
    default:
      formattedCoin = coin.toUpperCase();
  }
  return formattedCoin;
};

export const getChainFromSimplexNetworkCode = (
  currencyAbbreviation: string,
  networkCode?: SimplexCurrencyNetworkCode | null,
): string => {
  const networkCodeMapping: {[key: string]: string} = {
    arbitrum: 'arb',
    base: 'base',
    bitcoin: 'btc',
    bitcoin_cash: 'bch',
    dogecoin: 'doge',
    ethereum: 'eth',
    litecoin: 'ltc',
    optimism: 'op',
    polygon: 'pol',
    ripple: 'xrp',
  };

  if (!networkCode) {
    return currencyAbbreviation.toLowerCase();
  }

  return (
    networkCodeMapping[networkCode.toLowerCase()] ??
    currencyAbbreviation.toLowerCase()
  );
};

export const getSimplexSellPayoutMethodFormat = (
  method: WithdrawalMethodKey,
): SimplexPayoutMethodType | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: SimplexPayoutMethodType | undefined;
  switch (method) {
    case 'debitCard':
      formattedPaymentMethod = 'card';
      break;
    case 'sepaBankTransfer':
      formattedPaymentMethod = 'sepa';
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

export const getSimplexCountryFormat = (
  locationCountry: string,
  userCountry?: string | undefined,
): string => {
  if (userCountry && isEuCountry(userCountry)) {
    return userCountry;
  } else {
    return locationCountry;
  }
};

export const getSimplexBaseAmountFormat = (amount: number): number => {
  // base_amount should be integer, which counts millionths of a whole currency unit.
  const simplexBaseAmountFormat = Math.trunc(amount * 1e6);
  return simplexBaseAmountFormat;
};

export const getSimplexSellFiatAmountLimits = () => {
  return {
    fiatCurrency: 'EUR',
    min: 50, // fixed in EUR
    max: 15000, // fixed in EUR
  };
};

export const getPassthroughUri = (): string => {
  return __DEV__ ? PASSTHROUGH_URI_DEV : PASSTHROUGH_URI_PROD;
};

export const getSimplexSellReturnURL = (
  externalId: string,
  useSendMax?: boolean,
) => {
  const returnUrl =
    getPassthroughUri() +
    `end.html?flow=sell&success=true&externalId=${externalId}` +
    `${useSendMax ? '&sendMax=true' : ''}`;

  return returnUrl;
};

export interface SimplexSellStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const simplexSellGetStatusDetails = (
  status: SimplexSellOrderStatus,
): SimplexSellStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'bitpayFromCheckout':
      statusTitle = t('Sell Order started');
      statusDescription =
        t(
          'Sell order started. You must complete the selling process with our partner Simplex.',
        ) +
        '\n' +
        t(
          'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
        );
      break;
    case 'bitpayTxSent':
      statusTitle = t('Crypto payment sent');
      statusDescription =
        t('Payment sent, waiting for Simplex to receive and process it.') +
        '\n' +
        t(
          'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
        );
      break;
    default:
      statusTitle = undefined;
      statusDescription = undefined;
      break;
  }
  return {
    statusTitle,
    statusDescription,
  };
};

export const simplexSellGetStatusColor = (
  status: SimplexSellOrderStatus,
): string => {
  switch (status) {
    case 'bitpayFromCheckout':
    case 'bitpayTxSent':
      return '#9b9bab';
    default:
      return '#9b9bab';
  }
};
