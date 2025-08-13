import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {
  RampPaymentMethodType,
  RampQuoteRequestData,
  RampQuoteResultForPaymentMethod,
} from '../../../../store/buy-crypto/models/ramp.models';
import {PaymentMethodKey} from '../constants/BuyCryptoConstants';

export const rampEnv = __DEV__ ? 'sandbox' : 'production';

export const getRampCheckoutUri = (): string => {
  return __DEV__
    ? 'https://ri-widget-staging.firebaseapp.com'
    : 'https://buy.ramp.network';
};

export const rampSupportedFiatCurrencies = [
  'BAM',
  'BGN',
  'BMD',
  'BRL',
  'BWP',
  'CAD',
  'CHF',
  'COP',
  'CRC',
  'CZK',
  'DKK',
  'DOP',
  'EUR',
  'GEL',
  'GBP',
  'GTQ',
  'HNL',
  'HUF',
  'ILS',
  'ISK',
  'KWD',
  'LKR',
  'MDL',
  'MKD',
  'MXN',
  'MYR',
  'NZD',
  'PEN',
  'PLN',
  'PYG',
  'RON',
  'RSD',
  'SEK',
  'SGD',
  'THB',
  'USD',
  'UYU',
];

export const rampSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb',
  'eth_base',
  'eth_op',
  'doge',
  'ltc',
  'matic', // pol // backward compatibility
  'pol',
  'sol',
  'xrp',
];

export const rampSupportedErc20Tokens = [
  '1inch',
  'arkm',
  'bat',
  'dai',
  'ens',
  'fevr',
  'link',
  'mana',
  'rly',
  'sand',
  'ton',
  'usda',
  'usdc',
  'usdt',
  'xaut',
];

export const rampSupportedMaticTokens = [
  'bat',
  'dai',
  'eth',
  'mana',
  'ovr',
  'sand',
  'usdc',
  'usdc.e', // usdce in Ramp - Bridged USD Coin (0x2791bca1f2de4661ed88a30c99a7a9449aa84174) USDC.e
  'usdt',
  'weth', // MATIC-ETH in Ramp - (They call it ETH but use the WETH contract: 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619)
  'wmatic',
];

export const rampSupportedArbitrumTokens = [
  'usda',
  'usdc',
  'usdc.e', // usdce in Ramp - Bridged USD Coin (0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8) USDC.e
  'usdt',
];

export const rampSupportedBaseTokens = [
  'usdc',
  'usdc.e', // usdce in Ramp - Bridged USD Coin (0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA) USDC.e
];

export const rampSupportedOptimismTokens = [
  'dai',
  'usda',
  'usdc',
  'usdc.e', // usdce in Ramp - Bridged USD Coin (0x7F5c764cBc14f9669B88837ca1490cCa17c31607) USDC.e
  'usdt',
  'wld',
];

export const rampSupportedSolanaTokens = [
  'usdc', // prod: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v / test: BnLi8JcqbUUTu8UWJkHrgEztVpsnxYz83VGRKYSaMqxj
  'usdt', // prod: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB / test: JEGS6twrEXHdJaU7tkxubJ37Lopi58nEMNm1rVGD5M37
];

export const getRampSupportedCurrencies = (): string[] => {
  const rampSupportedCurrencies = [
    ...rampSupportedCoins,
    ...rampSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...rampSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...rampSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...rampSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...rampSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...rampSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return rampSupportedCurrencies;
};

export const rampCoinMapping = (coin: string): string => {
  let _coin = cloneDeep(coin);

  if (_coin?.toLowerCase() === 'usdc.e') {
    _coin = 'usdce';
  }
  return _coin;
};

export const getCoinFromRampCoinFormat = (coin: string): string => {
  let _coin = cloneDeep(coin);

  if (_coin?.toLowerCase() === 'usdce') {
    _coin = 'usdc.e';
  }
  return _coin;
};

export const getRampCoinFormat = (
  coin: string | undefined,
  chain: string | undefined,
): string => {
  coin = coin ? rampCoinMapping(externalServicesCoinMapping(coin)) : undefined;
  const _coin = coin ? cloneDeep(coin).toUpperCase() : undefined;
  const _chain = chain ? cloneDeep(chain).toUpperCase() : undefined;

  if (_coin === 'WETH' && _chain === 'MATIC') {
    return 'MATIC_ETH';
  }

  let formattedCoin: string = `${_chain}_${_coin}`;
  return formattedCoin;
};

export const getChainFromRampChainFormat = (
  chain: string | undefined,
): string | undefined => {
  if (!chain) {
    return undefined;
  }

  const chainMap: {[key: string]: string} = {
    arbitrum: 'arb',
    base: 'base',
    optimism: 'op',
    solana: 'sol',
  };

  return chainMap[chain.toLowerCase()] ?? chain;
};

export const getRampChainFormat = (chain: string): string | undefined => {
  const _chain = chain ? cloneDeep(chain).toLowerCase() : undefined;

  let formattedChain: string | undefined;
  switch (_chain) {
    case 'arb':
      formattedChain = 'arbitrum';
      break;
    case 'op':
      formattedChain = 'optimism';
      break;
    case 'sol':
      formattedChain = 'solana';
      break;
    default:
      formattedChain = _chain;
      break;
  }
  return formattedChain;
};

export const getRampFiatAmountLimits = () => {
  return {
    min: 20,
    max: 5500,
  };
};

export const getRampDefaultOfferData = (
  data: RampQuoteRequestData,
): RampQuoteResultForPaymentMethod => {
  return data.CARD_PAYMENT;
};

export const getRampPaymentMethodDataFromQuoteData = (
  paymentMethod: PaymentMethodKey,
  quoteData: RampQuoteRequestData,
) => {
  let paymentMethodData: RampQuoteResultForPaymentMethod | undefined;
  switch (paymentMethod) {
    case 'sepaBankTransfer':
      if (quoteData.MANUAL_BANK_TRANSFER) {
        paymentMethodData = quoteData.MANUAL_BANK_TRANSFER;
      }
      break;
    case 'applePay':
      if (quoteData.APPLE_PAY) {
        paymentMethodData = quoteData.APPLE_PAY;
      }
      break;
    case 'googlePay':
      if (quoteData.GOOGLE_PAY) {
        paymentMethodData = quoteData.GOOGLE_PAY;
      }
      break;
    case 'pisp':
      if (quoteData.OPEN_BANKING) {
        paymentMethodData = quoteData.OPEN_BANKING;
      } else if (quoteData.AUTO_BANK_TRANSFER) {
        paymentMethodData = quoteData.AUTO_BANK_TRANSFER;
      }
      break;
    case 'pix':
      if (quoteData.PIX) {
        paymentMethodData = quoteData.PIX;
      }
      break;
    case 'debitCard':
    case 'creditCard':
      if (quoteData.CARD_PAYMENT) {
        paymentMethodData = quoteData.CARD_PAYMENT;
      }
      break;
    default:
      paymentMethodData = getRampDefaultOfferData(quoteData);
  }
  return paymentMethodData;
};

export const getRampPaymentMethodFormat = (
  paymentMethod: PaymentMethodKey,
): RampPaymentMethodType => {
  switch (paymentMethod) {
    case 'sepaBankTransfer':
      return 'MANUAL_BANK_TRANSFER';
    case 'applePay':
      return 'APPLE_PAY';
    case 'googlePay':
      return 'GOOGLE_PAY';
    case 'pisp':
      return 'AUTO_BANK_TRANSFER';
    case 'pix':
      return 'PIX';
    case 'debitCard':
    case 'creditCard':
      return 'CARD_PAYMENT';
    default:
      return 'CARD_PAYMENT';
  }
};

export interface RampStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const rampGetStatusDetails = (status: string): RampStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Ramp.',
      );
      break;
    case 'pending':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
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
