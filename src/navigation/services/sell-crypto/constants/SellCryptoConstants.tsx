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
  waitingTimeDescription?: string;
  imgLogo: React.JSX.Element;
  imgIcon: React.JSX.Element;
  supportedExchanges: {
    [key in SellCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
  supportedCountries?: string[];
}

export const getWithdrawalMethodIconByKey = (
  key: WithdrawalMethodKey,
  w?: number,
  h?: number,
): React.JSX.Element | null => {
  const paymentMethod = WithdrawalMethodsAvailable[key];
  if (!paymentMethod) {
    return null;
  }
  return (
    <PaymentMethodIcon
      iconOnly={true}
      paymentMethodId={key}
      width={w ?? 20}
      height={h ?? 20}
    />
  );
};

export const WithdrawalMethodsAvailable: WithdrawalMethods = {
  ach: {
    order: 5,
    label: 'ACH Bank Transfer',
    method: 'ach',
    waitingTimeDescription: '1 - 3 business days',
    imgLogo: <PaymentMethodIcon paymentMethodId="ach" width={40} height={40} />,
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="ach"
        width={20}
        height={20}
      />
    ),
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="creditCard" width={40} height={40} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="creditCard"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="debitCard" width={40} height={40} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="debitCard"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: '1 - 3 business days',
    imgLogo: (
      <PaymentMethodIcon
        paymentMethodId="sepaBankTransfer"
        width={40}
        height={40}
      />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="sepaBankTransfer"
        width={20}
        height={20}
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
    waitingTimeDescription: '1 - 3 business days',
    imgLogo: (
      <PaymentMethodIcon
        paymentMethodId="gbpBankTransfer"
        width={40}
        height={40}
      />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="gbpBankTransfer"
        width={20}
        height={20}
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="paypal" width={80} height={80} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="paypal"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="venmo" width={80} height={80} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="venmo"
        width={20}
        height={20}
      />
    ),
    supportedExchanges: {
      moonpay: true,
      ramp: false,
      simplex: false,
    },
    enabled: true,
  },
};
