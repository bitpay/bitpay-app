export interface Currency {
  code: string;
  decimals: number;
  name: string;
  precision: number;
  symbol: string;
}

export interface Card {
  activationDate: string;
  brand: 'Mastercard' | null;
  cardType: 'virtual' | 'physical' | null;
  currency: Currency;
  disabled: boolean | null;
  id: string;
  lastFourDigits: string;
  lockedByUser: boolean;
  nickname: string;
  pagingSupport: boolean | null;
  provider: 'firstView' | 'galileo';
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

export interface PagedTransactionData {
  totalPageCount: number;
  currentPageNumber: number;
  totalRecordCount: number;
  transactionList: Transaction[];
}
