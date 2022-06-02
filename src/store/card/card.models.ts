import {CardBrand, CardProvider} from '../../constants/card';

export interface Currency {
  code: string;
  decimals: number;
  name: string;
  precision: number;
  symbol: string;
}

export interface Card {
  activationDate: string;
  brand: CardBrand | null;
  cardType: 'virtual' | 'physical' | null;
  currency: Currency;
  disabled: boolean | null;
  id: string;
  lastFourDigits: string;
  lockedByUser: boolean;
  nickname: string;
  pagingSupport: boolean | null;
  provider: CardProvider;
  status: 'active' | 'lost' | 'stolen' | 'canceled' | 'shipped' | string;
  token: string;
}

// TODO
// settled transaction? base transaction? pending?
export interface Transaction {
  amount: number;
  currency: string;
  dates: {
    /**
     * Date in milliseconds formatted as string.
     * Non-settled transactions will typically display this value.
     */
    auth: string;

    /**
     * Date in milliseconds formatted as string.
     * Settled transactions will typically display this value.
     */
    post: string;
  };
  description: string;
  displayMerchant: string;
  displayPrice: number;
  fees: {
    type: string;
    amount: number;
    currency: string;
  }[];
  feesTotal: number | null;
  id: string;
  merchant: {
    merchantCity: string | null;
    merchantName: string | null;
    merchantState: string | null;
  };
  provider: string;
  status: any;
  type: string;
}

export interface TopUp {
  amount: string;
  appliedDate: string;
  debitCard: string;
  displayMerchant: {
    merchantName: string;
    merchantCity: string;
    merchantState: string;
  };
  id: string;
  invoice: any;
  pending: boolean;
  provider: string;
  referralId: string | null;
  user: string;
}

export interface UiTransaction
  extends Omit<Transaction, 'amount' | 'currency' | 'fees' | 'feesTotal'> {
  settled: boolean;
}

export interface PagedTransactionData {
  totalPageCount: number;
  currentPageNumber: number;
  totalRecordCount: number;
  transactionList: Transaction[];
}

export interface DebitCardTopUpInvoiceParams {
  invoicePrice: number;
  invoiceCurrency: string;
  transactionCurrency: string;
  walletId: string;
}

export interface ReferredUsersType {
  expiration: string;
  familyName: string;
  givenName: string;
  status: string;
}

export interface CardData {
  cardholderName: string;
  primaryAccountNumberSuffix: string;
  localizedDescription?: string;
  paymentNetwork?: string;
}

export interface AddAppleWalletData {
  id: string;
  data: {
    cardholderName: string;
    primaryAccountSuffix: string;
    encryptionScheme: string;
  };
}
