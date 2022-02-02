import React, {useEffect, useMemo} from 'react';
import {useRef, useState} from 'react';
import {ScrollView} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import {useDispatch, useSelector} from 'react-redux';
import {WIDTH} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {CardEffects} from '../../../store/card';
import {Card, Transaction} from '../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import CardOverviewSlide from './CardOverviewSlide';
import TransactionsList from './CardTransactionsList';

interface CardDashboardProps {
  id: string | undefined | null;
}

const GroupEnabled = {
  firstView: false,
  galileo: true,
};

export class OverviewSlide {
  readonly provider: string;
  private readonly _cards: Card[] = [];

  get cards() {
    return this._cards;
  }

  get primaryCard() {
    return this._cards[0];
  }

  constructor(card: Card) {
    this.provider = card.provider;
    this._cards.push(card);
  }

  add(card: Card) {
    this._cards.push(card);
  }
}

const createOverviewSlides = (cards: Card[]) => {
  // sort galileo before firstView, then virtual before physical
  const sortedCards = cards.sort((a, b) => {
    if (a.provider === 'galileo' && b.provider === 'firstView') {
      return -1;
    }
    if (a.provider === 'firstView' && b.provider === 'galileo') {
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

  const slides = sortedCards.reduce((slideList, card) => {
    if (!GroupEnabled[card.provider]) {
      slideList.push(new OverviewSlide(card));

      return slideList;
    }

    let slide = slideList.find(g => g.provider === card.provider);

    if (slide) {
      slide.add(card);
    } else {
      slideList.push(new OverviewSlide(card));
    }

    return slideList;
  }, [] as OverviewSlide[]);

  return slides;
};

const CardDashboard: React.FC<CardDashboardProps> = props => {
  const dispatch = useDispatch();
  const {id} = props;
  const carouselRef = useRef<Carousel<OverviewSlide>>(null);
  const cards = useSelector<RootState, Card[]>(
    ({APP, CARD}) => CARD.cards[APP.network],
  );
  const virtualDesignCurrency = useSelector<RootState, VirtualDesignCurrency>(
    ({CARD}) => CARD.virtualDesignCurrency,
  );
  const memoizedSlides = useMemo(() => createOverviewSlides(cards), [cards]);
  const [initialSlideIdx] = useState(() =>
    id
      ? Math.max(
          0,
          memoizedSlides.findIndex(s => s.cards.some(c => c.id === id)),
        )
      : 0,
  );
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(initialSlideIdx);
  const fetchId = useSelector<RootState, string | null>(({CARD}) => {
    const activeSlideId = memoizedSlides[activeSlideIdx].primaryCard.id;

    // quick check to see if we've done an initial fetch for this ID before
    // TODO: a more robust check once we start loading tx activity
    return typeof CARD.balances[activeSlideId] !== 'number'
      ? activeSlideId
      : null;
  });

  const activeCard = memoizedSlides[activeSlideIdx].primaryCard;
  const settledTxList = (
    useSelector<RootState, Transaction[]>(
      ({CARD}) => CARD.settledTransactions[activeCard.id]?.transactionList,
    ) || []
  ).slice(0, 30);
  const pendingTxList = (
    useSelector<RootState, Transaction[]>(
      ({CARD}) => CARD.pendingTransactions[activeCard.id],
    ) || []
  ).slice(0, 30);

  useEffect(() => {
    if (fetchId) {
      dispatch(CardEffects.startFetchOverview(fetchId));
    }
  }, [fetchId, dispatch]);

  return (
    <ScrollView>
      <Carousel<OverviewSlide>
        ref={carouselRef}
        vertical={false}
        layout="default"
        activeSlideAlignment="center"
        firstItem={initialSlideIdx}
        data={memoizedSlides}
        renderItem={({item}) => (
          <CardOverviewSlide
            slide={item}
            designCurrency={virtualDesignCurrency}
          />
        )}
        onSnapToItem={setActiveSlideIdx}
        itemWidth={300 + 20}
        sliderWidth={WIDTH}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
        containerCustomStyle={{
          flexGrow: 0,
          marginBottom: 32,
        }}
      />

      <TransactionsList
        card={activeCard}
        pendingTxList={pendingTxList}
        settledTxList={settledTxList}
      />
    </ScrollView>
  );
};

export default CardDashboard;
