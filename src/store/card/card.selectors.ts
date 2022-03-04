import {createSelector} from 'reselect';
import {CardProvider} from '../../constants/card';
import {ProviderConfig} from '../../constants/config.card';
import {AppSelector} from '..';
import {Card} from './card.models';

class CardGroup {
  readonly provider: CardProvider;
  readonly cards: Card[] = [];

  constructor(card: Card) {
    this.provider = card.provider;
    this.cards.push(card);
  }
}

export const selectCards: AppSelector<Card[]> = ({APP, CARD}) =>
  CARD.cards[APP.network];

export const selectSortedCards = createSelector([selectCards], cards => {
  const sortedCards = cards.sort((a, b) => {
    if (
      a.provider === CardProvider.galileo &&
      b.provider === CardProvider.firstView
    ) {
      return -1;
    }
    if (
      a.provider === CardProvider.firstView &&
      b.provider === CardProvider.galileo
    ) {
      return 1;
    }

    if (a.cardType === 'virtual' && b.cardType === 'physical') {
      return -1;
    }
    if (a.cardType === 'physical' && b.cardType === 'virtual') {
      return 1;
    }
    return 0;
  });

  return sortedCards;
});

export const selectCardGroups = createSelector(
  [selectSortedCards],
  sortedCards => {
    const groups = sortedCards.reduce((groupList, card) => {
      if (!ProviderConfig[card.provider].groupEnabled) {
        groupList.push(new CardGroup(card));

        return groupList;
      }

      const group = groupList.find(g => g.provider === card.provider);

      if (group) {
        group.cards.push(card);
      } else {
        groupList.push(new CardGroup(card));
      }

      return groupList;
    }, [] as CardGroup[]);

    return groups.map(g => g.cards);
  },
);
