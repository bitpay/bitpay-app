import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useEffect, useLayoutEffect, useMemo} from 'react';
import {useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import Button from '../../../components/button/Button';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {
  Br,
  HeaderRightContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import {Smallest} from '../../../components/styled/Text';
import {CardProvider} from '../../../constants/card';
import {CARD_WIDTH, ProviderConfig} from '../../../constants/config.card';
import {CardEffects} from '../../../store/card';
import {
  Card,
  Transaction,
  UiTransaction,
} from '../../../store/card/card.models';
import {selectCardGroups} from '../../../store/card/card.selectors';
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
  id: string;
  navigation: StackNavigationProp<CardStackParamList, 'Home'>;
}

const toUiTransaction = (tx: Transaction, settled: boolean) => {
  const uiTx = tx as UiTransaction;

  uiTx.settled = settled;

  return uiTx;
};

const CardDashboard: React.FC<CardDashboardProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {id, navigation} = props;
  const carouselRef = useRef<Carousel<Card[]>>(null);
  const cardGroups = useAppSelector(selectCardGroups);
  const fetchOverviewStatus = useAppSelector(
    ({CARD}) => CARD.fetchOverviewStatus[id],
  );
  const virtualDesignCurrency = useAppSelector(
    ({CARD}) => CARD.virtualDesignCurrency,
  );

  const currentGroupIdx = Math.max(
    0,
    cardGroups.findIndex(g => g.some(c => c.id === id)),
  );
  const currentGroup = cardGroups[currentGroupIdx];
  const activeCard = currentGroup[0];
  const currentCardRef = useRef(activeCard);
  currentCardRef.current = activeCard;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            onPress={() =>
              navigation.navigate('Settings', {
                id: currentCardRef.current.id,
              })
            }
            buttonType="pill"
            buttonStyle="primary">
            {t('View Card Details')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  // if id does not exist as a key, tx for this card has not been initialized
  const pageData = useAppSelector(
    ({CARD}) => CARD.settledTransactions[activeCard.id],
  );
  const uninitializedId = pageData ? null : activeCard.id;
  const isLoadingInitial = fetchOverviewStatus === 'loading' && !pageData;

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
      ...(pendingTxList || []).map(tx => toUiTransaction(tx, false)),
      ...(settledTxList || [])
        .filter(filters.settledTx)
        .map(tx => toUiTransaction(tx, true)),
    ],
    [settledTxList, pendingTxList, filters],
  );

  const listFooterComponent = useMemo(
    () => (
      <TransactionListFooter>
        {activeCard.provider === CardProvider.galileo ? (
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
    () =>
      isLoadingInitial ? (
        <WalletTransactionSkeletonRow />
      ) : (
        <EmptyListContainer>
          <EmptyGhostContainer>
            <GhostImg />
          </EmptyGhostContainer>
          <EmptyListDescription>
            Load your cash account and get instant access to spending at
            thousands of merchants.
          </EmptyListDescription>
        </EmptyListContainer>
      ),
    [isLoadingInitial],
  );

  const renderSlide = useCallback(
    ({item}: {item: Card[]}) => (
      <CardOverviewSlide
        card={item[0]}
        designCurrency={virtualDesignCurrency}
      />
    ),
    [virtualDesignCurrency],
  );

  const renderTransaction = useCallback(
    ({item}: {item: UiTransaction}) => {
      return <TransactionRow key={item.id} tx={item} card={activeCard} />;
    },
    [activeCard],
  );

  const onRefresh = () => {
    dispatch(CardEffects.startFetchOverview(activeCard.id));
  };

  const fetchNextPage = () => {
    if (pageData) {
      const {currentPageNumber, totalPageCount} = pageData;
      const hasMorePages = currentPageNumber < totalPageCount;

      if (hasMorePages) {
        dispatch(
          CardEffects.startFetchSettledTransactions(activeCard.id, {
            pageNumber: currentPageNumber + 1,
          }),
        );
      }
    }
  };

  return (
    <FlatList
      data={filteredTransactions}
      renderItem={renderTransaction}
      initialNumToRender={30}
      onEndReachedThreshold={0.1}
      onEndReached={() => fetchNextPage()}
      ListHeaderComponent={
        <>
          <Carousel<Card[]>
            ref={carouselRef}
            vertical={false}
            layout="default"
            activeSlideAlignment="center"
            firstItem={currentGroupIdx}
            data={cardGroups}
            renderItem={renderSlide}
            onSnapToItem={idx => {
              navigation.setParams({
                id: cardGroups[idx][0].id,
              });
            }}
            itemWidth={CARD_WIDTH}
            sliderWidth={WIDTH}
            inactiveSlideScale={1}
            inactiveSlideOpacity={1}
            containerCustomStyle={{
              flexGrow: 0,
              marginBottom: 32,
              marginTop: 32,
            }}
          />

          {!isLoadingInitial ? (
            <TransactionListHeader>
              <TransactionListHeaderTitle>
                {filteredTransactions.length <= 0 ? null : 'Recent Activity'}
              </TransactionListHeaderTitle>

              <TransactionListHeaderIcon onPress={() => onRefresh()}>
                <RefreshIcon />
              </TransactionListHeaderIcon>
            </TransactionListHeader>
          ) : null}
        </>
      }
      ListFooterComponent={listFooterComponent}
      ListEmptyComponent={listEmptyComponent}
    />
  );
};

export default CardDashboard;
