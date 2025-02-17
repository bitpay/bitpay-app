import {
  RampPayoutMethodName,
  RampSellOrderStatus,
} from '../../../../store/sell-crypto/models/ramp-sell.models';
import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import cloneDeep from 'lodash.clonedeep';
import { RampAssetInfo } from '../../../../store/buy-crypto/models/ramp.models';
import { WithdrawalMethodKey } from '../constants/SellCryptoConstants';

export const rampSellEnv = __DEV__ ? 'sandbox' : 'production';

export const rampSellSupportedFiatCurrencies = ['EUR', 'USD']; // TODO: review this

export const rampSellSupportedCoins = [
  'btc',
  'eth',
  'eth_arb',
  'eth_op',
  'ltc',
  'doge',
  'pol', // MATIC_POL in RampSell
];

export const rampSellSupportedErc20Tokens: string[] = [
  '1inch',
  'bat',
  'dai',
  'ens',
  'link',
  'mana',
  'rly',
  'sand',
  // 'sol', SOLANA_SOL in RampSell
  'usda',
  'usdc',
  'usdt',
];
export const rampSellSupportedMaticTokens: string[] = [
  'dai',
  'usdc.e', // MATIC_USDCE in RampSell
  'weth', // MATIC_ETH in RampSell
];
export const rampSellSupportedArbitrumTokens: string[] = [
  'usda',
];
export const rampSellSupportedBaseTokens: string[] = [];
export const rampSellSupportedOptimismTokens: string[] = [
  'dai',
  'usda',
  'usdc.e', // OPTIMISM_USDCE in RampSell
  'wld',
];

export const getRampSellSupportedCurrencies = (): string[] => {
  const rampSellSupportedCurrencies = [
    ...rampSellSupportedCoins,
    ...rampSellSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...rampSellSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...rampSellSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...rampSellSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...rampSellSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
  ];

  return rampSellSupportedCurrencies;
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

  let formattedCoin: string = `${_chain}_${_coin}`;
  return formattedCoin;
};

export const getChainFromRampChainFormat = (
  chain: string | undefined,
): string => {
  const _chain = chain ? cloneDeep(chain).toLowerCase() : '';

  return _chain;
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
    default:
      formattedChain = _chain;
      break;
  }
  return formattedChain;
};

export const getRampSellFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  const currencyAbbreviationMapping: {
    [key: string]: {[key: string]: string};
  } = {
    matic: {
      matic: 'matic',
      pol: 'matic',
    },
  };

  const _currency = currency.toLowerCase();
  const chainMapping = currencyAbbreviationMapping[chain];

  if (chainMapping && chainMapping[_currency]) {
    return chainMapping[_currency];
  }

  return _currency;
};

export const getRampSellCurrenciesFixedProps = (
  rampCurrenciesData: RampAssetInfo[],
): RampAssetInfo[] => {
  const currencyMapping: {
    [key: string]: {
      code: string;
      name: string;
      chain?: string;
      contractAddress?: string;
    };
  } = {
    matic: {
      code: 'pol',
      name: 'Polygon',
      chain: 'matic',
    },
  };

  rampCurrenciesData.forEach((currency: RampAssetInfo) => {
    const key = currency.symbol.toLowerCase();
    const mapping = currencyMapping[key];

    if (
      mapping &&
      mapping.chain?.toLowerCase() ===
        currency.chain?.toLowerCase() &&
      (!mapping.contractAddress ||
        (currency.address &&
          mapping.contractAddress ===
            currency.address.toLowerCase()))
    ) {
      currency.symbol = mapping.code;
      currency.name = mapping.name;
    }
  });

  return rampCurrenciesData;
};

export const getRampSellCoinFormat = (
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

export const getRampSellFiatAmountLimits = () => { // TODO: review these limits
  return {
    min: 50, // fixed in USD
    max: 15000, // fixed in USD
  };
};

export const getPayoutMethodKeyFromRampType = (
  method: RampPayoutMethodName | undefined,
): WithdrawalMethodKey | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: WithdrawalMethodKey | undefined;
  switch (method) {
    case RampPayoutMethodName.AMERICAN_BANK_TRANSFER:
      formattedPaymentMethod = 'ach';
      break;
    case RampPayoutMethodName.CARD:
      formattedPaymentMethod = 'debitCard';
      break;
    case RampPayoutMethodName.SEPA:
      formattedPaymentMethod = 'sepaBankTransfer';
      break;
    default:
      formattedPaymentMethod = undefined;
      break;
  }
  return formattedPaymentMethod;
};

// case 'ach':
//   if (data.AMERICAN_BANK_TRANSFER) {
//     paymentMethodData = data.AMERICAN_BANK_TRANSFER;
//   }
//   break;
// case 'sepaBankTransfer':
//   if (data.SEPA) {
//     paymentMethodData = data.SEPA;
//   }
//   break;
// case 'debitCard':
// case 'creditCard':
//   if (data.CARD) {
//     paymentMethodData = data.CARD;
//   }
//   break;
// default:
//   paymentMethodData = data.CARD;

export interface RampSellStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const rampSellGetStatusDetails = (
  status: RampSellOrderStatus,
): RampSellStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'bitpayFromCheckout':
      statusTitle = t('Sell Order started');
      statusDescription =
        t(
          'Sell order started. You must complete the selling process with our partner Ramp.',
        ) +
        '\n' +
        t(
          'If you have successfully completed the entire crypto selling process, remember that receiving payment may take a few days.',
        );
      break;
    case 'bitpayTxSent':
      statusTitle = t('Crypto payment sent');
      statusDescription =
        t('Payment sent, waiting for Ramp to receive and process it.') +
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

export const rampSellGetStatusColor = (
  status: RampSellOrderStatus,
): string => {
  switch (status) {
    case 'bitpayFromCheckout':
    case 'bitpayTxSent':
      return '#9b9bab';
    default:
      return '#9b9bab';
  }
};
