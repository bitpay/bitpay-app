import {t} from 'i18next';
import {BanxaPaymentMethod} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {PaymentMethod} from '../constants/BuyCryptoConstants';
import cloneDeep from 'lodash.clonedeep';

export const banxaEnv = __DEV__ ? 'sandbox' : 'production';

export const banxaUrl = __DEV__
  ? 'https://bitpay.banxa-sandbox.com'
  : 'https://bitpay.banxa.com';

export const banxaSupportedFiatCurrencies = [
  'AED',
  'ARS',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'COP',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'IDR',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'QAR',
  'SAR',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'USD',
  'VND',
  'ZAR',
];

export const banxaSupportedCoins = [
  'bch',
  'btc',
  'eth',
  'eth_arb',
  'eth_base',
  'eth_op',
  'doge',
  'ltc',
  'matic', // POL // backward compatibility
  'pol',
  'sol',
  'xrp',
];

export const banxaSupportedErc20Tokens = [
  'aave',
  'ape',
  'audd',
  'avt',
  'axs',
  'bat',
  'boba',
  'bzr',
  'caga',
  'chz',
  'comp',
  'cvc',
  'dai',
  'euroc',
  'eurq',
  'eurr',
  'ftm',
  'grt',
  'imx',
  'kcs',
  'link',
  'looks',
  'lrc',
  'mana',
  'mkr',
  'mnt',
  'neiro',
  'omg',
  'omusd',
  'one',
  'order',
  'pax', // backward compatibility
  'perc',
  'pol',
  'propc',
  'pstake',
  'qrdo',
  'rlusd',
  'sand',
  'snx',
  'sushi',
  'uni',
  'usd0',
  'usdc',
  'usdp',
  'usdq',
  'usdr',
  'usdt',
  'verse',
  'wbtc',
  'wolf',
  'yfi',
  'zchf',
];

export const banxaSupportedMaticTokens = [
  'dai',
  'usdc',
  'usdt',
  'verse',
  'wombat',
];

export const banxaSupportedArbitrumTokens = ['gmx', 'grt', 'usdc', 'usdt'];

export const banxaSupportedBaseTokens = ['brett', 'dai', 'eurc', 'usdc'];

export const banxaSupportedOptimismTokens = ['usdc'];

export const banxaSupportedSolanaTokens = [
  'barsik',
  'melania',
  'trump',
  'usdc',
  'usdt',
];

export const getBanxaSupportedCurrencies = (): string[] => {
  const banxaSupportedCurrencies = [
    ...banxaSupportedCoins,
    ...banxaSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...banxaSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...banxaSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...banxaSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...banxaSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...banxaSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return banxaSupportedCurrencies;
};

export const getBanxaCoinFormat = (coin: string): string => {
  coin = externalServicesCoinMapping(coin);
  let formattedCoin: string = `${coin.toUpperCase()}`;
  return formattedCoin;
};

export const getBanxaSelectedPaymentMethodData = (
  banxaPaymentMethods: BanxaPaymentMethod[],
  selectedPaymentMethod: PaymentMethod,
): BanxaPaymentMethod | undefined => {
  let selectedBanxaPMData: BanxaPaymentMethod | undefined;

  switch (selectedPaymentMethod.method) {
    // "ach" | "applePay" | "creditCard" | "debitCard" | "sepaBankTransfer" | "other"
    case 'applePay':
      // Prioritize PRIMERAP or WORLDPAYAPPLE, if it is not included, look for cards type
      selectedBanxaPMData = banxaPaymentMethods.find(
        (banxaPaymentMethod: BanxaPaymentMethod) => {
          if (
            ['PRIMERAP', 'WORLDPAYAPPLE'].includes(
              banxaPaymentMethod.paymentType,
            )
          ) {
            return true;
          }
        },
      );

      if (!selectedBanxaPMData) {
        selectedBanxaPMData = banxaPaymentMethods.find(
          (banxaPaymentMethod: BanxaPaymentMethod) => {
            if (
              ['PRIMERCC', 'WORLDPAYCREDIT', 'CHECKOUTCREDIT'].includes(
                banxaPaymentMethod.paymentType,
              )
            ) {
              return true;
            }
          },
        );
      }
      break;
    case 'creditCard':
    case 'debitCard':
      // Prioritize PRIMERCC, if it is not included, look for WORLDPAYCREDIT or CHECKOUTCREDIT
      selectedBanxaPMData = banxaPaymentMethods.find(
        (banxaPaymentMethod: BanxaPaymentMethod) => {
          if (['PRIMERCC'].includes(banxaPaymentMethod.paymentType)) {
            return true;
          }
        },
      );

      if (!selectedBanxaPMData) {
        selectedBanxaPMData = banxaPaymentMethods.find(
          (banxaPaymentMethod: BanxaPaymentMethod) => {
            if (
              ['WORLDPAYCREDIT', 'CHECKOUTCREDIT'].includes(
                banxaPaymentMethod.paymentType,
              )
            ) {
              return true;
            }
          },
        );
      }
      break;
    case 'sepaBankTransfer':
      selectedBanxaPMData = banxaPaymentMethods.find(
        (banxaPaymentMethod: BanxaPaymentMethod) => {
          if (['CLEARJUNCTION'].includes(banxaPaymentMethod.paymentType)) {
            return true;
          }
        },
      );
      break;
    case 'other':
      selectedBanxaPMData = banxaPaymentMethods[0];
      break;
    default:
      selectedBanxaPMData = undefined;
      break;
  }

  return selectedBanxaPMData;
};

export const getBanxaChainFormat = (chain: string): string | undefined => {
  if (!chain) {
    return undefined;
  }

  let formattedChain: string | undefined = cloneDeep(chain)?.toUpperCase();

  switch (formattedChain) {
    case 'OP':
      return 'OPTIMISM'; // Banxa's docs use 'OPTIMISM' instead of 'OP'. Test this
    default:
      return formattedChain;
  }
};

export const getBanxaFiatAmountLimits = () => {
  return {
    min: 35,
    max: 14000,
  };
};

export interface BanxaStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const banxaGetStatusDetails = (status: string): BanxaStatus => {
  let statusDescription, statusTitle;
  // pendingPayment | waitingPayment | paymentReceived | inProgress | coinTransferred | cancelled | declined | expired | failed | complete | refunded

  switch (status) {
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Banxa.',
      );
      break;
    case 'pending':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'Payment request made. If you have successfully completed the entire payment process, remember that receiving crypto may take a few hours.',
      );
      break;
    case 'pendingPayment':
      statusTitle = t('Payment request made');
      statusDescription = t(
        'The order has been created. Banxa is waiting for customer to make payment for the order.',
      );
      break;
    case 'waitingPayment':
      statusTitle = t('Waiting payment');
      statusDescription = t(
        'The customer has made payment, waiting for final payment confirmation from any external payment systems.',
      );
      break;
    case 'paymentReceived':
      statusTitle = t('Payment received');
      statusDescription = t(
        'The customer has made payment and it has been confirmed.',
      );
      break;
    case 'inProgress':
      statusTitle = t('Order in progress');
      statusDescription = t('Order is being verified and processed.');
      break;
    case 'coinTransferred':
      statusTitle = t('Coins transferred');
      statusDescription = t(
        'The cryptocurrency transaction has been submitted to the blockchain.',
      );
      break;
    case 'cancelled':
      statusTitle = t('Order cancelled');
      statusDescription = t(
        'Thr order has been cancelled by the customer during the payment process.',
      );
      break;
    case 'declined':
      statusTitle = t('Order declined');
      statusDescription = t(
        'The order has been declined by external payment systems.',
      );
      break;
    case 'expired':
      statusTitle = t('Order expired');
      statusDescription = t(
        'The order has been created, but the customer has not made payment for the order within the expiry time.',
      );
      break;
    case 'failed':
      statusTitle = t('Order failed');
      statusDescription = t(
        'The order has failed at some point in the process.',
      );
      break;
    case 'complete':
      statusTitle = t('Order completed');
      statusDescription = t(
        'The order has been completed. Banxa deems the cryptocurrency transaction to be completed after 2 confirmations on blockchain.',
      );
      break;
    case 'refunded':
      statusTitle = t('Payment refunded');
      statusDescription = t(
        'The order has been refunded in response to a request from a customer.',
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
