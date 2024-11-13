import {SimplexPayoutMethodType} from '../../../../store/sell-crypto/models/simplex-sell.models';
import {t} from 'i18next';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {PaymentMethodKey} from '../constants/SellCryptoConstants';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {SimplexCurrencyNetworkCode} from '../../../../store/buy-crypto/models/simplex.models';
import {getPassthroughUri} from '../../buy-crypto/utils/simplex-utils';

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
  country?: string,
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

  return simplexSellSupportedCurrencies;
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
  method: PaymentMethodKey,
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

export const getSimplexSellReturnURL = (id: string, useSendMax?: boolean) => {
  const returnUrl =
    getPassthroughUri() +
    `end.html?flow=sell&success=true&externalId=${id}` +
    `${useSendMax ? '&sendMax=true' : ''}`;

  return returnUrl;
};

export interface SimplexSellStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const simplexSellGetStatusDetails = (
  status: string,
): SimplexSellStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'createdOrder':
      statusTitle = t('Sell Order started');
      statusDescription = t(
        'Sell order started. You must complete the selling process with our partner Simplex.',
      );
      break;
    case 'bitpayPending':
      statusTitle = t('Exchange waiting for crypto');
      statusDescription = t(
        'Simplex is waiting for payment in crypto from your BitPay wallet.',
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
    case 'bitpayCanceled':
      statusTitle = t('Canceled');
      statusDescription = t('Sell order canceled by user.');
      break;
    case 'waitingForDeposit':
      statusTitle = t('Waiting For Desposit');
      statusDescription = t(
        'Simplex is waiting for an incoming crypto payment.',
      );
      break;
    case 'pending':
      statusTitle = t('Pending');
      statusDescription = t(
        'Simplex received your payment and is processing the order. This may take a few minutes. Thanks for your patience.',
      );
      break;
    case 'completed':
      statusTitle = t('Finished');
      statusDescription = t(
        "Fiat amount were successfully sent to the user's payout method. Remember that depending on your Payout method, it may take a few days to be reflected.",
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        "Order has failed. In most cases, it's because you haven't properly verified your identity or payout method or you've reached your maximum daily/weekly sales limit.",
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

export const simplexSellGetStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#01d1a2';
    case 'failed':
    case 'bitpayCanceled':
      return '#df5264';
    case 'waitingForDeposit':
    case 'pending':
    case 'bitpayPending':
      return '#fdb455';
    case 'bitpayTxSent':
      return '#9b9bab';
    default:
      return '#9b9bab';
  }
};
