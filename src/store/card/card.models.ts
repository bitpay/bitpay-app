export interface Card {
  activationDate: string;
  brand: 'Mastercard' | null;
  cardType: 'virtual' | 'physical' | null;
  currency: {
    code: string;
    decimals: number;
    name: string;
    precision: number;
    symbol: string;
  };
  disabled: boolean | null;
  id: string;
  lastFourDigits: string;
  pagingSupport: boolean | null;
  provider: 'firstView' | 'galileo';
  status: 'active' | 'lost' | 'stolen' | 'canceled' | 'shipped' | string;
  token: string;
}
