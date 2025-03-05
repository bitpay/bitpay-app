import React from 'react';
import PaymentMethodIcon from '../../../../components/icons/payment-methods/payment-methods';
import {
  countriesWithACH,
  countriesWithGBPTransfer,
  countriesWithSEPA,
} from '../../constants/PaymentMethodsConstants';
import {SellCryptoExchangeKey} from '../utils/sell-crypto-utils';

export type WithdrawalMethodKey =
  | 'ach'
  | 'creditCard'
  | 'debitCard'
  | 'sepaBankTransfer'
  | 'gbpBankTransfer'
  | 'paypal'
  | 'venmo';

export type WithdrawalMethods = {
  [key in WithdrawalMethodKey]: WithdrawalMethod;
};

export interface WithdrawalMethod {
  order: number;
  label: string;
  method: WithdrawalMethodKey;
  imgSrc: JSX.Element;
  supportedExchanges: {
    [key in SellCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
  supportedCountries?: string[];
}

export const WithdrawalMethodsAvailable: WithdrawalMethods = {
  ach: {
    order: 5,
    label: 'ACH Bank Transfer',
    method: 'ach',
    imgSrc: <PaymentMethodIcon paymentMethodId="ach" width={40} height={40} />,
    supportedExchanges: {
      moonpay: true,
      ramp: true,
      simplex: false,
    },
    supportedCountries: countriesWithACH,
    enabled: true,
  },
  creditCard: {
    order: 4,
    label: 'Credit Card',
    method: 'creditCard',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="creditCard" width={40} height={40} />
    ),
    supportedExchanges: {
      moonpay: false,
      ramp: true,
      simplex: true,
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
      moonpay: true,
      ramp: true,
      simplex: true,
    },
    enabled: true,
  },
  sepaBankTransfer: {
    order: 6,
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
      moonpay: true,
      ramp: true,
      simplex: true,
    },
    supportedCountries: countriesWithSEPA,
    enabled: true,
  },
  gbpBankTransfer: {
    order: 7,
    label: 'GBP Bank Transfer',
    method: 'gbpBankTransfer',
    imgSrc: (
      <PaymentMethodIcon
        paymentMethodId="gbpBankTransfer"
        width={40}
        height={40}
      />
    ),
    supportedExchanges: {
      moonpay: true,
      ramp: false,
      simplex: false,
    },
    supportedCountries: countriesWithGBPTransfer,
    enabled: true,
  },
  paypal: {
    order: 2,
    label: 'PayPal',
    method: 'paypal',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="paypal" width={80} height={80} />
    ),
    supportedExchanges: {
      moonpay: true,
      ramp: false,
      simplex: false,
    },
    enabled: true,
  },
  venmo: {
    order: 3,
    label: 'Venmo',
    method: 'venmo',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="venmo" width={80} height={80} />
    ),
    supportedExchanges: {
      moonpay: true,
      ramp: false,
      simplex: false,
    },
    enabled: true,
  },
};
