import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {
  MoonpayCardBrand,
  MoonpayPaymentType,
  MoonpayTransactionStage,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
import {PaymentMethodKey} from '../constants/BuyCryptoConstants';
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';

export const moonpayEnv = __DEV__ ? 'sandbox' : 'production';

// Origin the MoonPay embedded frames are loaded from.
export const MOONPAY_DEFAULT_FRAME_ORIGIN = 'https://blocks.moonpay.com';

// Where customers are sent for help with a MoonPay order (buy and sell).
export const MOONPAY_SUPPORT_URL = 'https://support.moonpay.com';

export const moonpaySupportedFiatCurrencies = [
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'DOP',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'HRK',
  'IDR',
  'ILS',
  'JOD',
  'JPY',
  'KES',
  'KRW',
  'KWD',
  'LKR',
  'MAD',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NZD',
  'OMR',
  'PEN',
  'PKR',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'USD',
  'VND',
  'ZAR',
];

export const moonpaySupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // eth_arbitrum in Moonpay
  'eth_base', // eth_base in Moonpay
  'eth_op', // eth_optimism in Moonpay
  'ltc',
  'doge',
  'matic', // pol_polygon in Moonpay // backward compatibility
  'pol', // pol_polygon in Moonpay
  'sol',
  'xrp',
];

export const nonUSMoonpaySupportedCoins = [];

export const moonpaySupportedErc20Tokens = [
  'bat',
  'dai',
  'gods',
  'grt',
  'imx',
  'link',
  'mana',
  'matic', // backward compatibility
  'pixel',
  'pepe',
  'pol',
  'pyusd',
  'rlusd',
  'shib',
  'steth',
  'uni',
  'usdc',
  'usdt',
  'venom',
  'zrx',
];

export const nonUSMoonpaySupportedErc20Tokens = [
  '1inch', // 1inch_eth
  'aave',
  'ape',
  'arb',
  'arkm', // arkm_eth
  'axs',
  'blur', // blur_eth
  'chz',
  'comp',
  'crv', // crv_eth
  'eigen', // eigen_eth
  'ens',
  'fet', // fet_eth
  'floki',
  'key',
  'ldo', // ldo_eth
  'looks',
  'lpt', // lpt_eth
  'mkr',
  'neiro', // neiro_eth
  'okb',
  'om',
  'ondo', // ondo_eth
  'portal',
  'sand',
  'slp',
  'snx',
  'trb', // trb_eth
  'uni',
  'utk',
  'verse',
  'wbtc',
  'weth',
  'wld',
];

export const moonpaySupportedMaticTokens = [
  'crv', // crv_pol
  'gmt', // gmt_polygon
  'usdc', // usdc_polygon
  'usdt', // usdt_polygon
  'weth', // eth_polygon
];

export const moonpaySupportedArbitrumTokens = [
  'arb', // arb_arb
  'magic', // magic_arbitrum
  'usdc', // usdc_arbitrum
  'usdt', // usdt_arbitrum
];

export const moonpaySupportedBaseTokens = [
  'degen', // degen_base
  'usdc', // usdc_base
];

export const moonpaySupportedOptimismTokens = [
  'usdc', // usdc_optimism
  'usdt', // usdt_optimism
  'wld', // wld_optimism
];

export const moonpaySupportedSolanaTokens = [
  'bonk', // bonk_sol
  'gmt', // gmt_sol
  'jto', // jto_sol
  'jup', // jup_sol
  'me', // me_sol
  'mew', // mew_sol
  'moodeng', // moodeng_sol
  'pengu', // pengu_sol
  'pnut', // pnut_sol
  'pyth', // pyth - no "_sol" needed
  'pyusd', // pyusd_sol
  'ray', // ray_sol
  'render', // render_sol
  'trump', // trump_sol
  'usdc', // usdc_sol
  'usdt', // usdt_sol
  'wif', // wif_sol
];

export const getMoonpaySupportedCurrencies = (country?: string): string[] => {
  let moonpaySupportedCurrencies = [
    ...moonpaySupportedCoins,
    ...moonpaySupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...moonpaySupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...moonpaySupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...moonpaySupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...moonpaySupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...moonpaySupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  if (country !== 'US') {
    moonpaySupportedCurrencies = moonpaySupportedCurrencies.concat(
      nonUSMoonpaySupportedCoins,
    );
    moonpaySupportedCurrencies = moonpaySupportedCurrencies.concat(
      nonUSMoonpaySupportedErc20Tokens.map(ethToken => {
        return getCurrencyAbbreviation(ethToken, 'eth');
      }),
    );
  }

  return moonpaySupportedCurrencies;
};

export const getMoonpayFixedCurrencyAbbreviation = (
  currency: string,
  chain: string,
): string => {
  let coin = cloneDeep(currency).toLowerCase();
  coin = externalServicesCoinMapping(coin);

  switch (chain) {
    case 'eth':
      if (
        [
          '1inch',
          'arkm',
          'blur',
          'crv',
          'eigen',
          'fet',
          'ldo',
          'lpt',
          'neiro',
          'ondo',
          'trb',
        ].includes(coin)
      ) {
        return coin + '_eth';
      } else {
        return coin;
      }
    case 'matic':
      if (['crv'].includes(coin)) {
        return coin + '_pol';
      } else {
        return coin + '_polygon';
      }
    case 'arb':
      if (['arb'].includes(coin)) {
        return coin + '_arb';
      } else {
        return coin + '_arbitrum';
      }
    case 'base':
      return coin + '_base';
    case 'op':
      return coin + '_optimism';
    case 'sol':
      if (['pyth'].includes(coin)) {
        return 'pyth';
      } else if (coin !== 'sol') {
        return coin + '_sol';
      } else {
        return coin;
      }
    default:
      return coin;
  }
};

export const getMoonpayPaymentMethodFormat = (
  method: PaymentMethodKey | undefined,
  isEmbeddedFlow?: boolean,
): MoonpayPaymentType | undefined => {
  let moonpayPaymentMethod: MoonpayPaymentType | undefined;
  if (method) {
    switch (method) {
      case 'debitCard':
      case 'creditCard':
        moonpayPaymentMethod = isEmbeddedFlow ? 'card' : 'credit_debit_card';
        break;
      case 'sepaBankTransfer':
        moonpayPaymentMethod = isEmbeddedFlow ? 'sepa' : 'sepa_bank_transfer';
        break;
      case 'applePay':
        moonpayPaymentMethod = isEmbeddedFlow ? 'apple_pay' : 'mobile_wallet';
        break;
      case 'paypal':
        moonpayPaymentMethod = 'paypal';
        break;
      case 'venmo':
        moonpayPaymentMethod = 'venmo';
        break;
      case 'cashApp':
        moonpayPaymentMethod = 'cash_app';
        break;
      default:
        moonpayPaymentMethod = undefined;
        break;
    }
  }
  return moonpayPaymentMethod;
};
// Whether the remote config allows a given payment method in MoonPay's
// embedded flow. embeddedBuyDisabled is a global kill switch: if set, every
// embedded payment method is disabled regardless of the per-method flags.
const isMoonpayEmbeddedPaymentMethodEnabledByConfig = (
  method: PaymentMethodKey | undefined,
  buyCryptoConfig: BuyCryptoConfig | undefined,
): boolean => {
  const moonpayConfig = buyCryptoConfig?.moonpay?.config;
  if (moonpayConfig?.embeddedBuyDisabled === true) {
    return false;
  }
  const moonpayPaymentMethods = moonpayConfig?.paymentMethods;
  switch (method) {
    case 'applePay':
      return !moonpayPaymentMethods?.applePayEmbedded?.disabled;
    case 'creditCard':
    case 'debitCard':
      return !moonpayPaymentMethods?.cardEmbedded?.disabled;
    case 'sepaBankTransfer':
      return !moonpayPaymentMethods?.sepaEmbedded?.disabled;
    default:
      return false;
  }
};

// Whether MoonPay's embedded flow can actually be used for a payment method:
// allowed by config, and supported at runtime. Apple Pay additionally needs
// native wallet support on the device, and SEPA needs MoonPay to report it as
// headless-capable (capabilities.requiresWidget === false).
export const isMoonpayEmbeddedPaymentMethodEnabled = (
  method: PaymentMethodKey | undefined,
  buyCryptoConfig: BuyCryptoConfig | undefined,
  applePaySupported?: boolean,
  sepaHeadlessSupported?: boolean,
): boolean => {
  if (!isMoonpayEmbeddedPaymentMethodEnabledByConfig(method, buyCryptoConfig)) {
    return false;
  }
  switch (method) {
    case 'applePay':
      return !!applePaySupported;
    case 'sepaBankTransfer':
      return !!sepaHeadlessSupported;
    default:
      return true;
  }
};

// Whether it's worth connecting to MoonPay's embedded flow at all. SEPA's
// runtime capability is only known after connecting, so only its config flag
// can be taken into account here.
export const isAnyMoonpayEmbeddedPaymentMethodEnabled = (
  buyCryptoConfig: BuyCryptoConfig | undefined,
  applePaySupported?: boolean,
): boolean =>
  isMoonpayEmbeddedPaymentMethodEnabled(
    'applePay',
    buyCryptoConfig,
    applePaySupported,
  ) ||
  isMoonpayEmbeddedPaymentMethodEnabledByConfig(
    'creditCard',
    buyCryptoConfig,
  ) ||
  isMoonpayEmbeddedPaymentMethodEnabledByConfig(
    'sepaBankTransfer',
    buyCryptoConfig,
  );

export const getMoonpayCardBrandLabel = (brand: MoonpayCardBrand): string => {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'maestro':
      return 'Maestro';
    case 'american_express':
      return 'American Express';
    default:
      return t('Card');
  }
};

// reasons documented for a saved card's availability.reasons
export const getMoonpayCardUnavailableReason = (
  reason: string | undefined,
): string | undefined => {
  switch (reason) {
    case 'card_expired':
      return t('Expired');
    case 'card_declined':
      return t('Declined');
    case 'card_blocked':
      return t('Blocked');
    default:
      return reason ? t('Unavailable') : undefined;
  }
};

export const getMoonpayFiatAmountLimits = () => {
  return {
    min: 30,
    max: 30000,
  };
};

export interface MoonpayStatus {
  statusTitle?: string;
  statusDescription?: string;
}

export const moonpayGetStatusDetails = (status: string): MoonpayStatus => {
  let statusDescription, statusTitle;
  switch (status) {
    case 'embeddedPaymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'The transaction was created and payment is accepted. The transfer is in progress.',
      );
      break;
    case 'paymentRequestSent':
      statusTitle = t('Attempted payment request');
      statusDescription = t(
        'Payment request made. You must complete the purchase process with our partner Moonpay.',
      );
      break;
    case 'waitingPayment':
      statusTitle = t('Waiting Payment');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'pending':
      statusTitle = t('Pending');
      statusDescription = t(
        'Moonpay is purchasing your crypto. This takes between a few minutes and a few hours. Thanks for your patience.',
      );
      break;
    case 'waitingAuthorization':
      statusTitle = t('Waiting Authorization');
      statusDescription = t(
        'The order has been received and authorization is pending.',
      );
      break;
    case 'completed':
      statusTitle = t('Finished');
      statusDescription = t(
        'Coins were successfully sent to the recipient address.',
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        "Transaction has failed. In most cases, it's because you haven't properly verified your identity or payment method or you've reached your maximum daily/weekly purchase limit.",
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

// Bank transfers stay 'pending' from the moment the purchase is created until
// the money settles, which can take days, so the top-level status says very
// little on its own. MoonPay's guide points to the stages array for the real
// progress: once waiting_payment succeeds the deposit has arrived.
// https://dev.moonpay.com/platform/guides/pay-with-bank-transfer
const getMoonpaySepaFailureDescription = (
  failureReason?: string | null,
): string | undefined => {
  switch (failureReason) {
    case 'timeout_bank_transfer':
      return t(
        'Moonpay did not receive your bank transfer in time, so this purchase was cancelled. You can start a new one whenever you are ready.',
      );
    default:
      return typeof failureReason === 'string'
        ? t('Failure Reason: ') + failureReason
        : undefined;
  }
};

export const moonpayGetSepaStatusDetails = (
  status: string,
  stages?: MoonpayTransactionStage[],
): MoonpayStatus => {
  if (status === 'completed') {
    return moonpayGetStatusDetails(status);
  }

  const failedStage = stages?.find(stage => stage.status === 'failed');
  if (failedStage) {
    return {
      statusTitle: t('Failed'),
      statusDescription:
        getMoonpaySepaFailureDescription(failedStage.failureReason) ??
        moonpayGetStatusDetails('failed').statusDescription,
    };
  }

  if (status === 'failed') {
    return moonpayGetStatusDetails(status);
  }

  const waitingForPayment = {
    statusTitle: t('Waiting for your transfer'),
    statusDescription: t(
      'Send the bank transfer using the details below, including the reference. Your crypto amount is an estimate until the money arrives.',
    ),
  };

  // Without the stages there is no way to tell how far along it is, and the
  // generic pending copy ('Moonpay is purchasing your crypto') is wrong here:
  // nothing happens until the customer sends the money.
  if (!stages?.length) {
    return waitingForPayment;
  }

  const currentStage =
    stages.find(stage => stage.status === 'in_progress') ??
    stages.find(stage => stage.status === 'not_started');

  switch (currentStage?.kind) {
    case 'waiting_payment':
      return waitingForPayment;
    case 'verification':
      return {
        statusTitle: t('Verification'),
        statusDescription: t(
          'Your transfer arrived and Moonpay is reviewing it. Nothing else is needed from you for now.',
        ),
      };
    case 'processing':
      return {
        statusTitle: t('Processing'),
        statusDescription: t(
          'Your transfer arrived and Moonpay is purchasing your crypto.',
        ),
      };
    case 'delivery':
      return {
        statusTitle: t('Delivery'),
        statusDescription: t(
          'Moonpay is sending your crypto to the recipient address.',
        ),
      };
    default:
      // Any other stage MoonPay adds: their own name for it beats a wrong
      // guess, and the description stays neutral about where the money is.
      return currentStage
        ? {
            statusTitle: currentStage.name,
            statusDescription: t('Moonpay is working on your purchase.'),
          }
        : moonpayGetStatusDetails(status);
  }
};

export const moonpaySepaIsWaitingForPayment = (
  status?: string,
  stages?: MoonpayTransactionStage[],
): boolean => {
  if (status === 'completed' || status === 'failed') {
    return false;
  }
  const waitingStage = stages?.find(stage => stage.kind === 'waiting_payment');
  if (!waitingStage) {
    // Stages unknown (not read yet, or the read failed): a purchase that has
    // not reached a terminal state is most likely still waiting for the money.
    return true;
  }
  // Explicitly not 'failed': a timed-out transfer is over, and asking for the
  // money again would be worse than showing nothing.
  return (
    waitingStage.status === 'in_progress' ||
    waitingStage.status === 'not_started'
  );
};

export const moonpayGetStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#01d1a2';
    case 'failed':
      return '#df5264';
    case 'waitingPayment':
    case 'pending':
    case 'waitingAuthorization':
      return '#fdb455';
    default:
      return '#9b9bab';
  }
};
