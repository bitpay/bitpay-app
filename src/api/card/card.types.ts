import {Card} from '../../store/card/card.models';

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
        pendingTransactions: [];
        settledTransactions: {
          currentPageNumber: number;
          totalPageCount: number;
          totalRecordCount: number;
          transactionList: [];
        };
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
