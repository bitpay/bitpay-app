import React from 'react';

// Images
import BankIcon from '../../../../../assets/img/services/payment-methods/icon-bank.svg';
import CreditCardIcon from '../../../../../assets/img/services/payment-methods/icon-creditcard.svg';
import DebitCardIcon from '../../../../../assets/img/services/payment-methods/icon-debitcard.svg';
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
    imgSrc: <BankIcon width={40} height={40} />,
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
    imgSrc: <CreditCardIcon width={40} height={40} />,
    supportedExchanges: {
      moonpay: false,
      simplex: true,
    },
    enabled: true,
  },
  debitCard: {
    label: 'Debit Card',
    method: 'debitCard',
    imgSrc: <DebitCardIcon width={40} height={40} />,
    supportedExchanges: {
      moonpay: true,
      simplex: true,
    },
    enabled: true,
  },
  sepaBankTransfer: {
    label: 'SEPA Bank Transfer',
    method: 'sepaBankTransfer',
    imgSrc: <BankIcon width={40} height={40} />,
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
    imgSrc: <BankIcon width={40} height={40} />,
    supportedExchanges: {
      moonpay: true,
      simplex: false,
    },
    supportedCountries: countriesWithGBPTransfer,
    enabled: true,
  },
};
