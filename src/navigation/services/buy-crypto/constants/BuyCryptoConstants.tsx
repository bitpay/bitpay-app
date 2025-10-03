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
  waitingTimeDescription?: string;
  imgLogo: React.JSX.Element;
  imgIcon: React.JSX.Element;
  supportedExchanges: {
    [key in BuyCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
  supportedCountries?: string[];
}

export const getPaymentMethodIconByKey = (
  key: PaymentMethodKey,
  w?: number,
  h?: number,
): React.JSX.Element | null => {
  const paymentMethod = PaymentMethodsAvailable[key];
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

export const PaymentMethodsAvailable: PaymentMethods = {
  ach: {
    order: 6,
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="applePay" width={40} height={40} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="applePay"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="googlePay" width={60} height={60} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="googlePay"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: 'Select at checkout with provider',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="other" width={40} height={40} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="other"
        width={20}
        height={20}
      />
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
    waitingTimeDescription: '1 - 3 business days',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="pisp" width={40} height={40} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="pisp"
        width={20}
        height={20}
      />
    ),
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
    waitingTimeDescription: '< 10 mins',
    imgLogo: (
      <PaymentMethodIcon paymentMethodId="pix" width={100} height={100} />
    ),
    imgIcon: (
      <PaymentMethodIcon
        iconOnly={true}
        paymentMethodId="pix"
        width={20}
        height={20}
      />
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
