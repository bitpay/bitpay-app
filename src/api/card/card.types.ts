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
