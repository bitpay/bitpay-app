import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useEffect, useLayoutEffect, useMemo} from 'react';
import {useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import Button from '../../../components/button/Button';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import {
  Br,
  HeaderRightContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import {Smallest} from '../../../components/styled/Text';
import {ProviderConfig} from '../../../constants/config.card';
import {CardEffects} from '../../../store/card';
import {Card} from '../../../store/card/card.models';
import {CardProvider} from '../../../store/card/card.types';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';
import {
  EmptyGhostContainer,
  EmptyListContainer,
  EmptyListDescription,
  TransactionListFooter,
  TransactionListHeader,
  TransactionListHeaderIcon,
  TransactionListHeaderTitle,
} from './CardDashboard.styled';
import CardOverviewSlide from './CardOverviewSlide';
import TransactionRow from './CardTransactionRow';

interface CardDashboardProps {
  id: string | undefined | null;
  navigation: StackNavigationProp<CardStackParamList, 'Home'>;
}

const GroupEnabled = {
  firstView: false,
  galileo: true,
};

export class OverviewSlide {
  readonly provider: CardProvider;
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

const buildOverviewSlides = (cards: Card[]) => {
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
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {id, navigation} = props;
  const carouselRef = useRef<Carousel<OverviewSlide>>(null);
  const cards = useAppSelector(({APP, CARD}) => CARD.cards[APP.network]);
  const virtualDesignCurrency = useAppSelector(
    ({CARD}) => CARD.virtualDesignCurrency,
  );
  const memoizedSlides = useMemo(() => buildOverviewSlides(cards), [cards]);

  // if id was passed in, try to find the slide that contains that id
  // if not, default to 0
  const activeSlideIdx = id
    ? Math.max(
        0,
        memoizedSlides.findIndex(s => s.cards.some(c => c.id === id)),
      )
    : 0;
  const activeSlide = memoizedSlides[activeSlideIdx];
  const activeCard = activeSlide.primaryCard;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            onPress={() =>
              navigation.navigate('Settings', {
                slide: activeSlide,
                id: activeSlide.primaryCard.id,
              })
            }
            buttonType="pill"
            buttonStyle="primary">
            {t('View Card Details')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [activeSlide, navigation, t]);

  // if id does not exist as a key, tx for this card has not been initialized
  const uninitializedId = useAppSelector(({CARD}) =>
    CARD.settledTransactions[activeCard.id] ? null : activeCard.id,
  );

  useEffect(() => {
    if (uninitializedId) {
      dispatch(CardEffects.startFetchOverview(uninitializedId));
    }
  }, [uninitializedId, dispatch]);

  const {filters} = ProviderConfig[activeCard.provider];
  const settledTxList = useAppSelector(
    ({CARD}) => CARD.settledTransactions[activeCard.id]?.transactionList,
  );
  const pendingTxList = useAppSelector(
    ({CARD}) => CARD.pendingTransactions[activeCard.id],
  );

  const filteredTransactions = useMemo(
    () => [
      ...(pendingTxList || []),
      ...(settledTxList || []).filter(filters.settledTx),
    ],
    [settledTxList, pendingTxList, filters],
  );

  const listFooterComponent = useMemo(
    () => (
      <TransactionListFooter>
        {activeCard.provider === 'galileo' ? (
          <>
            <Smallest>{t('TermsAndConditionsMastercard')}</Smallest>

            <Br />

            <Smallest>{t('TermsAndConditionsMastercard2')}</Smallest>
          </>
        ) : null}
      </TransactionListFooter>
    ),
    [activeCard.provider, t],
  );

  const listEmptyComponent = useMemo(
    () => (
      <EmptyListContainer>
        <EmptyGhostContainer>
          <GhostImg />
        </EmptyGhostContainer>
        <EmptyListDescription>
          Load your cash account and get instant access to spending at thousands
          of merchants.
        </EmptyListDescription>
      </EmptyListContainer>
    ),
    [],
  );

  const renderSlide = useCallback(
    ({item}) => (
      <CardOverviewSlide
        card={item.primaryCard}
        designCurrency={virtualDesignCurrency}
      />
    ),
    [virtualDesignCurrency],
  );

  const renderTransaction = useCallback(
    ({item}) => {
      return (
        <TransactionRow
          key={item.id}
          tx={item}
          card={activeCard}
          settled={true}
        />
      );
    },
    [activeCard],
  );

  const onRefresh = () => {
    dispatch(CardEffects.startFetchOverview(activeCard.id));
  };

  return (
    <FlatList
      data={filteredTransactions}
      renderItem={renderTransaction}
      initialNumToRender={30}
      ListHeaderComponent={
        <>
          <Carousel<OverviewSlide>
            ref={carouselRef}
            vertical={false}
            layout="default"
            activeSlideAlignment="center"
            firstItem={activeSlideIdx}
            data={memoizedSlides}
            renderItem={renderSlide}
            onSnapToItem={idx => {
              navigation.setParams({
                id: memoizedSlides[idx].primaryCard.id,
              });
            }}
            itemWidth={300 + 20}
            sliderWidth={WIDTH}
            inactiveSlideScale={1}
            inactiveSlideOpacity={1}
            containerCustomStyle={{
              flexGrow: 0,
              marginBottom: 32,
              marginTop: 32,
            }}
          />

          <TransactionListHeader>
            <TransactionListHeaderTitle>
              {filteredTransactions.length <= 0 ? null : 'Recent Activity'}
            </TransactionListHeaderTitle>

            <TransactionListHeaderIcon onPress={() => onRefresh()}>
              <RefreshIcon />
            </TransactionListHeaderIcon>
          </TransactionListHeader>
        </>
      }
      ListFooterComponent={listFooterComponent}
      ListEmptyComponent={listEmptyComponent}
    />
  );
};

export default CardDashboard;
