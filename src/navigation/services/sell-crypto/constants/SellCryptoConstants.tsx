import React from 'react';
import PaymentMethodIcon from '../../../../components/icons/payment-methods/payment-methods';
import {
  countriesWithACH,
  countriesWithGBPTransfer,
  countriesWithSEPA,
} from '../../constants/PaymentMethodsConstants';
import {SellCryptoExchangeKey} from '../utils/sell-crypto-utils';

// ach_bank_transfer, credit_debit_card, sepa_bank_transfer and gbp_bank_transfer
export type PaymentMethodKey =
  | 'ach'
  | 'creditCard'
  | 'debitCard'
  | 'sepaBankTransfer'
  | 'gbpBankTransfer';

export type PaymentMethods = {
  [key in PaymentMethodKey]: PaymentMethod;
};

export interface PaymentMethod {
  label: string;
  method: PaymentMethodKey;
  imgSrc: JSX.Element;
  supportedExchanges: {
    [key in SellCryptoExchangeKey]: boolean;
  };
  enabled: boolean;
  supportedCountries?: string[];
}

export const PaymentMethodsAvailable: PaymentMethods = {
  ach: {
    label: 'ACH Bank Transfer',
    method: 'ach',
    imgSrc: <PaymentMethodIcon paymentMethodId="ach" width={40} height={40} />,
    supportedExchanges: {
      moonpay: true,
      simplex: false,
    },
    supportedCountries: countriesWithACH,
    enabled: true,
  },
  creditCard: {
    label: 'Credit Card',
    method: 'creditCard',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="creditCard" width={40} height={40} />
    ),
    supportedExchanges: {
      moonpay: false,
      simplex: true,
    },
    enabled: true,
  },
  debitCard: {
    label: 'Debit Card',
    method: 'debitCard',
    imgSrc: (
      <PaymentMethodIcon paymentMethodId="debitCard" width={40} height={40} />
    ),
    supportedExchanges: {
      moonpay: true,
      simplex: true,
    },
    enabled: true,
  },
  sepaBankTransfer: {
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
      simplex: true,
    },
    supportedCountries: countriesWithSEPA,
    enabled: true,
  },
  gbpBankTransfer: {
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
      simplex: false,
    },
    supportedCountries: countriesWithGBPTransfer,
    enabled: true,
  },
};
