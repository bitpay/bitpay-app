import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import {SharedElement} from 'react-navigation-shared-element';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import Button from '../../../components/button/Button';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {
  ActiveOpacity,
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
  TopUp,
  Transaction,
  UiTransaction,
} from '../../../store/card/card.models';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WalletScreens} from '../../wallet/WalletStack';
import {CardStackParamList} from '../CardStack';
import {
  EmptyGhostContainer,
  EmptyListContainer,
  EmptyListDescription,
  FloatingActionButton,
  FloatingActionButtonContainer,
  FloatingActionButtonIconContainer,
  FloatingActionButtonText,
  TransactionListFooter,
  TransactionListHeader,
  TransactionListHeaderIcon,
  TransactionListHeaderTitle,
} from './CardDashboard.styled';
import CardOverviewSlide from './CardOverviewSlide';
import TransactionRow from './CardTransactionRow';
import PlusSvg from '../../../../assets/img/card/icons/plus.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BuyCryptoScreens} from '../../services/buy-crypto/BuyCryptoStack';

interface CardDashboardProps {
  id: string;
  navigation: StackNavigationProp<CardStackParamList, 'Home'>;
}

const toUiTransaction = (tx: Transaction, settled: boolean) => {
  const uiTx: UiTransaction = {
    ...tx,
    settled,
  };

  return uiTx;
};

const topUpToUiTopUp = (topUp: TopUp) => {
  const uiTx: UiTransaction = {
    id: topUp.id,
    displayMerchant: 'BitPay Load',
    settled: false,
    displayPrice: Number(topUp.amount),
    merchant: topUp.displayMerchant,
    provider: topUp.provider,
    status: 'pending',
    dates: {
      auth: topUp.invoice.invoiceTime as string,
      post: topUp.invoice.invoiceTime as string,
    },

    // unused
    type: '',
    description: '',
  };

  return uiTx;
};

const sortPendingTxByTimestamp = (
  a: Pick<UiTransaction, 'dates'>,
  b: Pick<UiTransaction, 'dates'>,
) => {
  const timestampA = a.dates.auth;
  const timestampB = b.dates.auth;

  if (timestampA > timestampB) {
    return -1;
  }
  if (timestampA < timestampB) {
    return 1;
  }
  return 0;
};
const CardDashboard: React.FC<CardDashboardProps> = props => {
  const dispatch = useAppDispatch();
  const navigator = useNavigation();
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

  const keys = useAppSelector(({WALLET}) => Object.values(WALLET.keys));

  const getLengthOfWalletsWithBalance = useMemo(
    () =>
      keys.flatMap(key => key.wallets).filter(({balance: {sat}}) => sat > 0)
        .length,
    [keys],
  );

  const currentGroupIdx = Math.max(
    0,
    cardGroups.findIndex(g => g.some(c => c.id === id)),
  );
  const currentGroup = cardGroups[currentGroupIdx];
  const activeCard = currentGroup[0];
  const currentCardRef = useRef(activeCard);
  currentCardRef.current = activeCard;

  const onViewDetailsClick = () => {
    navigation.navigate('Settings', {
      id: currentCardRef.current.id,
    });
  };
  const onViewDetailsClickRef = useRef(onViewDetailsClick);
  onViewDetailsClickRef.current = onViewDetailsClick;

  const goToConfirmScreen = (amount: number) => {
    navigator.navigate('Wallet', {
      screen: WalletScreens.DEBIT_CARD_CONFIRM,
      params: {
        amount,
        card: activeCard,
      },
    });
  };

  const goToAmountScreen = () => {
    if (getLengthOfWalletsWithBalance) {
      navigator.navigate('Wallet', {
        screen: WalletScreens.AMOUNT,
        params: {
          fiatCurrencyAbbreviation: activeCard.currency.code,
          opts: {hideSendMax: true},
          onAmountSelected: selectedAmount =>
            goToConfirmScreen(+selectedAmount),
        },
      });
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: 'No funds available',
          message: 'You do not have any funds to send.',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'Add funds',
              action: () =>
                navigator.navigate('BuyCrypto', {
                  screen: BuyCryptoScreens.ROOT,
                  params: {amount: 50},
                }),
              primary: true,
            },
            {
              text: 'Got It',
              action: () => null,
              primary: false,
            },
          ],
        }),
      );
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            onPress={() => onViewDetailsClickRef.current()}
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
  // only auto-initialize once per mount
  const [autoInitState, setAutoInitState] = useState(
    {} as {[k: string]: boolean},
  );
  const uninitializedId = autoInitState[activeCard.id] ? null : activeCard.id;
  const isLoadingInitial = fetchOverviewStatus === 'loading' && !pageData;

  useFocusEffect(
    useCallback(() => {
      if (uninitializedId) {
        setAutoInitState({...autoInitState, [uninitializedId]: true});
        dispatch(CardEffects.startFetchOverview(uninitializedId));
      }
    }, [uninitializedId, autoInitState, dispatch]),
  );

  const {filters} = ProviderConfig[activeCard.provider];
  const settledTxList = useAppSelector(
    ({CARD}) => CARD.settledTransactions[activeCard.id]?.transactionList,
  );
  const pendingTxList = useAppSelector(
    ({CARD}) => CARD.pendingTransactions[activeCard.id],
  );
  const topUpHistory = useAppSelector(({CARD}) => CARD.topUpHistory[id]);

  const filteredTransactions = useMemo(() => {
    const uiPendingTxList = [
      ...(pendingTxList || []).map(tx => toUiTransaction(tx, false)),
      ...(topUpHistory || []).map(tu => topUpToUiTopUp(tu)),
    ].sort(sortPendingTxByTimestamp);

    return [
      ...uiPendingTxList,
      ...(settledTxList || [])
        .filter(filters.settledTx)
        .map(tx => toUiTransaction(tx, true)),
    ];
  }, [settledTxList, pendingTxList, topUpHistory, filters]);

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
    ({item}: {item: Card[]}) =>
      activeCard.id === item[0].id ? (
        <SharedElement
          id={'card.dashboard.active-card'}
          style={{paddingHorizontal: 10}}>
          <CardOverviewSlide
            card={item[0]}
            designCurrency={virtualDesignCurrency}
          />
        </SharedElement>
      ) : (
        <CardOverviewSlide
          card={item[0]}
          designCurrency={virtualDesignCurrency}
        />
      ),
    [virtualDesignCurrency, activeCard.id],
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
    <>
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
              itemWidth={CARD_WIDTH + 20}
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
      <FloatingActionButtonContainer>
        <FloatingActionButton
          onPress={() => goToAmountScreen()}
          activeOpacity={ActiveOpacity}>
          <FloatingActionButtonIconContainer>
            <PlusSvg />
          </FloatingActionButtonIconContainer>
          <FloatingActionButtonText>{t('Add Funds')}</FloatingActionButtonText>
        </FloatingActionButton>
      </FloatingActionButtonContainer>
    </>
  );
};

export default CardDashboard;
