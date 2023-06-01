import {
  Card,
  PagedTransactionData,
  TopUp,
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
      topUpHistory: TopUp[];
    };
  };
}

export interface FetchSettledTransactionsResponse {
  user: {
    card: {
      id: string;
      overview: {
        dateAccountOpened: string;
        settledTransactions: PagedTransactionData;
      };
    };
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

export interface UpdateCardLockResponse {
  user: {
    card: {
      locked: string;
    };
  };
}

export interface ActivateCardResponse {
  user: {
    card: {
      /**
       * Activation date in ms, as a string.
       */
      activationDate: string;
    };
  };
}