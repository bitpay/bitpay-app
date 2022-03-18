import React from 'react';
import {Platform} from 'react-native';

// Images
import ApplePayIcon from '../../../../../assets/img/services/payment-methods/apple-pay-logo.svg';
import BankIcon from '../../../../../assets/img/services/payment-methods/icon-bank.svg';
import CreditCardIcon from '../../../../../assets/img/services/payment-methods/icon-creditcard.svg';
import DebitCardIcon from '../../../../../assets/img/services/payment-methods/icon-debitcard.svg';

export const PaymentMethodsAvailable = {
  applePay: {
    label: 'Apple Pay',
    method: 'applePay',
    imgSrc: <ApplePayIcon width={40} height={40} />,
    supportedExchanges: {
      simplex: true,
      wyre: true,
    },
    enabled: Platform.OS === 'ios',
  },
  sepaBankTransfer: {
    label: 'SEPA Bank Transfer',
    method: 'sepaBankTransfer',
    imgSrc: <BankIcon width={40} height={40} />,
    supportedExchanges: {
      simplex: true, // EU Only
      wyre: false,
    },
    enabled: true,
  },
  creditCard: {
    label: 'Credit Card',
    method: 'creditCard',
    imgSrc: <CreditCardIcon width={40} height={40} />,
    supportedExchanges: {
      simplex: true,
      wyre: false,
    },
    enabled: true,
  },
  debitCard: {
    label: 'Debit Card',
    method: 'debitCard',
    imgSrc: <DebitCardIcon width={40} height={40} />,
    supportedExchanges: {
      simplex: true,
      wyre: true,
    },
    enabled: true,
  },
};
