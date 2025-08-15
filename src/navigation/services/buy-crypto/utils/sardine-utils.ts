import {t} from 'i18next';
import {SardinePaymentType} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {PaymentMethodKey} from '../constants/BuyCryptoConstants';

export const sardineEnv = __DEV__ ? 'sandbox' : 'production';

export const sardineSupportedFiatCurrencies = [
  'ALL',
  'AOA',
  'BBD',
  'BGN',
  'BRL',
  'BZD',
  'CHF',
  'CRC',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HUF',
  'HN',
  'IDR',
  'ISK',
  'JMD',
  'JPY',
  'KGS',
  'KMF',
  'KRW',
  'MGA',
  'MXN',
  'MYR',
  'MZN',
  'NOK',
  'OMR',
  'PEN',
  'PH',
  'PLN',
  'PYG',
  'RON',
  'SCR',
  'SEK',
  'THB',
  'TRY',
  'TZS',
  'USD',
  'UYU',
  'VND',
  'XCD',
  'XOF',
];

export const sardineSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb',
  'doge',
  'ltc',
  'matic', // backward compatibility
  'pol',
  'sol',
  'xrp',
];

export const sardineSupportedErc20Tokens = [
  'aave',
  'ape',
  'axs',
  'bat',
  'comp',
  'dai',
  'enj',
  'grt',
  'knc',
  'link',
  'mana',
  'matic', // backward compatibility
  'mkr',
  'omg',
  'pax', // backward compatibility
  'paxg',
  'pol',
  'sand',
  'shib',
  'tusd',
  'uni',
  'usdc',
  'usdp',
  'usdt',
  'wbtc',
  'zrx',
];

export const sardineSupportedMaticTokens = ['usdc'];

export const sardineSupportedArbitrumTokens = ['usdc'];

export const sardineSupportedSolanaTokens = ['usdc'];

export const getSardineSupportedCurrencies = (): string[] => {
  const sardineSupportedCurrencies = [
    ...sardineSupportedCoins,
    ...sardineSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...sardineSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...sardineSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...sardineSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return sardineSupportedCurrencies;
};

export const getSardineCoinFormat = (coin: string): string => {
  coin = externalServicesCoinMapping(coin);
  let formattedCoin: string = `${coin.toUpperCase()}`;
  return formattedCoin;
};

export const getSardineChainFormat = (chain: string): string | undefined => {
  if (!chain) {
    return undefined;
  }

  const chainMap: Record<string, string> = {
    arb: 'arbitrum',
    btc: 'bitcoin',
    bch: 'bitcoin_cash',
    eth: 'ethereum',
    doge: 'dogecoin',
    ltc: 'litecoin',
    matic: 'polygon',
    sol: 'solana',
    xrp: 'ripple',
  };

  return chainMap[chain.toLowerCase()];
};

export const getSardinePaymentMethodFormat = (
  method: PaymentMethodKey,
  country?: string,
): SardinePaymentType | undefined => {
  if (!method) {
    return undefined;
  }
  let formattedPaymentMethod: SardinePaymentType | undefined;
  switch (method) {
    case 'ach':
      formattedPaymentMethod = 'ach';
      break;
    case 'applePay':
      formattedPaymentMethod = 'apple_pay';
      break;
    case 'debitCard':
      formattedPaymentMethod =
        country === 'US' ? 'debit' : 'international_debit';
      break;
    case 'creditCard':
      formattedPaymentMethod =
        country === 'US' ? 'credit' : 'international_credit';
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

export const getSardineFiatAmountLimits = () => {
  return {
    min: 50,
    max: 3000,
  };
};

export interface SardineStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const sardineGetStatusDetails = (status: string): SardineStatus => {
  let statusDescription, statusTitle;
  // Draft | Processed | Declined | UserCustody | Complete | Completed

  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Sardine.',
      );
      break;
    case 'pending':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
      );
      break;
    case 'Draft':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'There is an open or ongoing order. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
      );
      break;
    case 'Processed':
      statusTitle = t('Payment processed');
      statusDescription = t(
        'The payment has been completed. Remember that receiving crypto may take a few hours.',
      );
      break;
    case 'Declined':
      statusTitle = t('Payment declined');
      statusDescription = t(
        'The transacation was declined, due to payment method issues.',
      );
      break;
    case 'UserCustody':
      statusTitle = t('Payment processed');
      statusDescription = t(
        "Crypto purchased for user but is in Sardine's custodied wallet. Remember that receiving crypto may take a few hours.",
      );
      break;
    case 'Complete':
    case 'Completed':
      statusTitle = t('Payment completed');
      statusDescription = t(
        "The payment is complete and the crypto has been delivered to the user's wallet.",
      );
      break;
    case 'Expired':
      statusTitle = t('Payment expired');
      statusDescription = t('Order expired before execution.');
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
