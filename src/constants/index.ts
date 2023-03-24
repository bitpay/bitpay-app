import {Platform} from 'react-native';

export enum Network {
  mainnet = 'livenet',
  testnet = 'testnet',
}

export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';

export const URL = {
  /**
   * Environments
   */
  BITPAY_PROD: 'https://bitpay.com',
  BITPAY_TEST: 'https://test.bitpay.com',
  BITPAY_STAGING: 'https://staging.bitpay.com',

  /**
   * Website links
   */
  PRIVACY_POLICY: 'https://bitpay.com/about/privacy',
  ACCESSIBILITY_STATEMENT: 'https://bitpay.com/legal/accessibility/',
  EXCHANGE_RATES: 'https://bitpay.com/exchange-rates',
  HELP_WIZARD: 'https://bitpay.com/request-help',
  TOU_GENERAL: 'https://bitpay.com/legal/terms-of-use',
  TOU_BITPAY_ID:
    'https://bitpay.com/legal/terms-of-use/#bitpay-id-terms-of-use',
  TOU_WALLET: 'https://bitpay.com/legal/terms-of-use/#wallet-terms-of-use',
  MERCHANT_DASHBOARD: 'https://bitpay.com/dashboard',
  PERSONAL_DASHBOARD: 'https://bitpay.com/id',
  PERSONAL_DASHBOARD_CARD: 'https://bitpay.com/id/card',
  POLYGON_BRIDGE: 'https://wallet.polygon.technology/bridge',

  /**
   * Help articles
   */
  HELP_AND_SUPPORT: 'https://support.bitpay.com/hc/en-us',
  HELP_MINER_FEES:
    'https://support.bitpay.com/hc/en-us/articles/115003393863-What-are-bitcoin-miner-fees-',
  HELP_SPENDING_PASSWORD:
    'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-',
  HELP_LOW_AMOUNT:
    'https://support.bitpay.com/hc/en-us/articles/115004497783-What-does-the-BitPay-wallet-s-warning-amount-too-low-to-spend-mean-',
  HELP_TXS_UNCONFIRMED:
    'https://support.bitpay.com/hc/en-us/articles/360025484512-Missing-transactions-Why-is-my-transaction-unconfirmed-',
  HELP_FORGOT_WALLET_ENCRYPT_PASSWORD:
    'https://support.bitpay.com/hc/en-us/articles/115003004403-I-forgot-my-wallet-s-encrypted-password-What-can-I-do-',
  HELP_SINGLE_ADDRESS:
    'https://support.bitpay.com/hc/en-us/articles/360015920572-Setting-up-the-Single-Address-Feature-for-your-BitPay-Wallet',

  /**
   * Quick Links
   */
  LEAVE_FEEDBACK: 'https://payux.typeform.com/to/DWIC0Kky',

  /**
   * Card resources
   */
  VISA_FAQ:
    'https://support.bitpay.com/hc/en-us/categories/360004308991-BitPay-Prepaid-Debit-Visa-Card-US-',
  MASTERCARD_CARDHOLDER_AGREEMENT:
    'https://bitpay.com/assets/pdfs/mcb-mastercard-cha-06-22.pdf',
  MASTERCARD_FEES_DISCLOSURE:
    'https://bitpay.com/assets/pdfs/gpr-mastercard-short-form.pdf',
  MASTERCARD_FAQ:
    'https://support.bitpay.com/hc/en-us/categories/115000745966-BitPay-Card',

  /**
   * Settings
   * */
  REQUEST_FEATURE: 'https://payux.typeform.com/to/QOxsnCzo',
  REPORT_ISSUE: 'https://bitpay.com/request-help/wizard?category=wallet',

  /**
   * XRP destination tag
   * */
  HELP_DESTINATION_TAG:
    'https://support.bitpay.com/hc/en-us/articles/360039839312-What-are-XRP-Destination-Tags-',

  /**
   * WalletConnect v1
   * */
  WALLET_CONNECT_V1_SUNSET_NOTICE:
    'https://medium.com/walletconnect/walletconnect-v1-0-sunset-notice-and-migration-schedule-8af9d3720d2e',
};
