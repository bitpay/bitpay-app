import {
  Card,
  PagedTransactionData,
  Transaction,
} from '../../store/card/card.models';

export interface FetchAllCardsResponse {
  user: {
    cards: Card[];
  };
}

export interface FetchCardResponse {
  user: {
    card: Card;
  };
}

export interface FetchOverviewResponse {
  user: {
    card: {
      id: string;
      balance: number;
      overview: {
        dateAccountOpened: string;
        pendingTransactions: Transaction[];
        settledTransactions: PagedTransactionData;
      };
    };
    cards: [
      {
        id: string;
        topUpHistory: [];
      },
    ];
  };
}

export interface FetchVirtualCardImageUrlsResponse {
  user: {
    [k: `card${number}`]: {
      id: string;
      virtualCardImage: string;
    };
  };
}
