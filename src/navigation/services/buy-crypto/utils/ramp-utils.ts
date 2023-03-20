import {t} from 'i18next';
import {
  RampQuoteRequestData,
  RampQuoteResultForPaymentMethod,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const rampEnv = __DEV__ ? 'sandbox' : 'production';

export const getRampCheckoutUri = (): string => {
  return __DEV__
    ? 'https://ri-widget-staging.firebaseapp.com'
    : 'https://buy.ramp.network';
};

export const rampSupportedFiatCurrencies = ['EUR', 'GBP', 'USD'];
export const rampSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'doge',
  'ltc',
  'matic',
  'xrp',
];

export const rampSupportedErc20Tokens = [
  'bat',
  'dai',
  'ens',
  'fevr',
  'link',
  'mana',
  'rly',
  'sand',
  'usdc',
  'usdt',
];

export const rampSupportedMaticTokens = [
  'bat',
  'dai',
  'eth',
  'mana',
  'ovr',
  'sand',
  'usdc',
];

export const getRampSupportedCurrencies = (): string[] => {
  const rampSupportedCurrencies = rampSupportedCoins
    .concat(
      rampSupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    )
    .concat(
      rampSupportedMaticTokens.map(maticToken => {
        return getCurrencyAbbreviation(maticToken, 'matic');
      }),
    );
  return rampSupportedCurrencies;
};

export const getRampCoinFormat = (coin: string, chain: string): string => {
  let formattedCoin: string = `${coin.toUpperCase()}_${chain.toUpperCase()}`;
  return formattedCoin;
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
