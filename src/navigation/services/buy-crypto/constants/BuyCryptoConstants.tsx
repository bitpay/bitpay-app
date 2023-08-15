import React from 'react';
import {Platform} from 'react-native';

// Images
import ApplePayIcon from '../../../../../assets/img/services/payment-methods/apple-pay-logo.svg';
import BankIcon from '../../../../../assets/img/services/payment-methods/icon-bank.svg';
import CreditCardIcon from '../../../../../assets/img/services/payment-methods/icon-creditcard.svg';
import DebitCardIcon from '../../../../../assets/img/services/payment-methods/icon-debitcard.svg';
import {BuyCryptoExchangeKey} from '../utils/buy-crypto-utils';

export type PaymentMethodKey =
  | 'ach'
  | 'applePay'
  | 'creditCard'
  | 'debitCard'
  | 'sepaBankTransfer'
  | 'other';

export type PaymentMethods = {
  [key in PaymentMethodKey]: PaymentMethod;
};

export interface PaymentMethod {
  label: string;
  method: PaymentMethodKey;
  imgSrc: JSX.Element;
  supportedExchanges: {
    [key in BuyCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
}

export const PaymentMethodsAvailable: PaymentMethods = {
  ach: {
    label: 'ACH Bank Transfer',
    method: 'ach',
    imgSrc: <BankIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: false,
      moonpay: false,
      ramp: false,
      sardine: true,
      simplex: false,
    },
    enabled: true,
  },
  applePay: {
    label: 'Apple Pay',
    method: 'applePay',
    imgSrc: <ApplePayIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: false,
      simplex: true,
    },
    enabled: Platform.OS === 'ios',
  },
  creditCard: {
    label: 'Credit Card',
    method: 'creditCard',
    imgSrc: <CreditCardIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
    },
    enabled: true,
  },
  debitCard: {
    label: 'Debit Card',
    method: 'debitCard',
    imgSrc: <DebitCardIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
    },
    enabled: true,
  },
  sepaBankTransfer: {
    label: 'SEPA Bank Transfer',
    method: 'sepaBankTransfer',
    imgSrc: <BankIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: false,
      simplex: true, // EU Only
    },
    enabled: true,
  },
  other: {
    label: 'Other',
    method: 'other',
    imgSrc: <CreditCardIcon width={40} height={40} />,
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
    },
    enabled: true,
  },
};
