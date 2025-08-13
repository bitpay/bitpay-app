import React from 'react';
import {Platform} from 'react-native';
import PaymentMethodIcon from '../../../../components/icons/payment-methods/payment-methods';
import {
  countriesWithACH,
  countriesWithPIX,
  countriesWithSEPA,
} from '../../constants/PaymentMethodsConstants';
import {BuyCryptoExchangeKey} from '../utils/buy-crypto-utils';

export type PaymentMethodKey =
  | 'ach'
  | 'applePay'
  | 'creditCard'
  | 'debitCard'
  | 'googlePay'
  | 'sepaBankTransfer'
  | 'other'
  | 'paypal'
  | 'pisp'
  | 'pix'
  | 'venmo';

export type PaymentMethods = {
  [key in PaymentMethodKey]: PaymentMethod;
};

export interface PaymentMethod {
  order: number;
  label: string;
  method: PaymentMethodKey;
  imgSrc: JSX.Element;
  supportedExchanges: {
    [key in BuyCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
  supportedCountries?: string[];
}

export const PaymentMethodsAvailable: PaymentMethods = {
  ach: {
    order: 6,
    label: 'ACH Bank Transfer',
    method: 'ach',
    imgSrc: <PaymentMethodIcon paymentMethodId="ach" width={40} height={40} />,
    supportedExchanges: {
      banxa: false,
      moonpay: false,
      ramp: false,
      sardine: true,
      simplex: false,
      transak: false,
    },
    supportedCountries: countriesWithACH,
    enabled: true,
  },
  applePay: {
    order: 2,
    label: 'Apple Pay',
    method: 'applePay',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="applePay" width={40} height={40} />
    ),
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
      transak: true,
    },
    enabled: Platform.OS === 'ios',
  },
  creditCard: {
    order: 5,
    label: 'Credit Card',
    method: 'creditCard',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="creditCard" width={40} height={40} />
    ),
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
      transak: true,
    },
    enabled: true,
  },
  debitCard: {
    order: 1,
    label: 'Debit Card',
    method: 'debitCard',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="debitCard" width={40} height={40} />
    ),
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
      transak: true,
    },
    enabled: true,
  },
  googlePay: {
    order: 8,
    label: 'Google Pay',
    method: 'googlePay',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="googlePay" width={60} height={60} />
    ),
    supportedExchanges: {
      banxa: false,
      moonpay: false,
      ramp: false,
      sardine: false,
      simplex: false,
      transak: false,
    },
    enabled: false,
  },
  sepaBankTransfer: {
    order: 7,
    label: 'SEPA Bank Transfer',
    method: 'sepaBankTransfer',
    imgSrc: (
      <PaymentMethodIcon
        paymentMethodId="sepaBankTransfer"
        width={40}
        height={40}
      />
    ),
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true, // EU Only
      simplex: true, // EU Only
      transak: true,
    },
    supportedCountries: countriesWithSEPA,
    enabled: true,
  },
  other: {
    order: 11,
    label: 'Other',
    method: 'other',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="other" width={40} height={40} />
    ),
    supportedExchanges: {
      banxa: true,
      moonpay: true,
      ramp: true,
      sardine: true,
      simplex: true,
      transak: true,
    },
    enabled: true,
  },
  paypal: {
    order: 3,
    label: 'PayPal',
    method: 'paypal',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="paypal" width={80} height={80} />
    ),
    supportedExchanges: {
      banxa: false,
      moonpay: true,
      ramp: false,
      sardine: false,
      simplex: false,
      transak: false,
    },
    enabled: true,
  },
  pisp: {
    order: 9,
    label: 'PISP',
    method: 'pisp',
    imgSrc: <PaymentMethodIcon paymentMethodId="pisp" width={40} height={40} />,
    supportedExchanges: {
      banxa: false,
      moonpay: false,
      ramp: true,
      sardine: false,
      simplex: false,
      transak: false,
    },
    supportedCountries: countriesWithSEPA, // same as SEPA
    enabled: true, // Only if fiatCurrency === GBP | EUR
  },
  pix: {
    order: 10,
    label: 'Pix',
    method: 'pix',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="pix" width={100} height={100} />
    ),
    supportedExchanges: {
      banxa: false,
      moonpay: false,
      ramp: true,
      sardine: false,
      simplex: false,
      transak: false,
    },
    supportedCountries: countriesWithPIX,
    enabled: true, // Only if fiatCurrency === BRL
  },
  venmo: {
    order: 4,
    label: 'Venmo',
    method: 'venmo',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="venmo" width={80} height={80} />
    ),
    supportedExchanges: {
      banxa: false,
      moonpay: true,
      ramp: false,
      sardine: false,
      simplex: false,
      transak: false,
    },
    enabled: true,
  },
};
