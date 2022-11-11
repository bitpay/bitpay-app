import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import React, {useCallback, useLayoutEffect, useMemo} from 'react';
import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Carousel from 'react-native-snap-carousel';
import {SharedElement} from 'react-navigation-shared-element';
import styled from 'styled-components/native';
import PlusSvg from '../../../../assets/img/card/icons/plus.svg';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import Button from '../../../components/button/Button';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {
  ActiveOpacity,
  Br,
  HeaderRightContainer,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {Smallest} from '../../../components/styled/Text';
import {CardProvider} from '../../../constants/card';
import {CARD_WIDTH} from '../../../constants/config.card';
import {navigationRef} from '../../../Root';
import {AppEffects} from '../../../store/app';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Analytics} from '../../../store/app/app.effects';
import {selectBrazeCardOffers} from '../../../store/app/app.selectors';
import {CardEffects} from '../../../store/card';
import {Card, UiTransaction} from '../../../store/card/card.models';
import {
  selectCardGroups,
  selectDashboardTransactions,
} from '../../../store/card/card.selectors';
import {isActivationRequired} from '../../../utils/card';
import {
  useAppDispatch,
  useAppSelector,
  useBrazeRefreshOnFocus,
} from '../../../utils/hooks';
import {BuyCryptoScreens} from '../../services/buy-crypto/BuyCryptoStack';
import {WalletScreens} from '../../wallet/WalletStack';
import {CardHomeScreenProps} from '../screens/CardHome';
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
import CardOffers from './CardOffers';
import CardOverviewSlide from './CardOverviewSlide';
import ShippingStatus from './CardShippingStatus';
import TransactionRow from './CardTransactionRow';

interface CardDashboardProps extends CardHomeScreenProps {
  id: string;
}

const CardsRowContainer = styled.View`
  padding: ${ScreenGutter};
`;

const CardOffersContainer = styled.View`
  margin: -16px;
  padding: 16px;
`;

const BelowCarouselSpacer = styled.View`
  height: 32px;
`;

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
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const network = useAppSelector(({APP}) => APP.network);
  const brazeCardOffers = useAppSelector(selectBrazeCardOffers);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  useBrazeRefreshOnFocus();

  const hasWalletsWithBalance = useMemo(
    () =>
      Object.values(keys)
        .flatMap(key => key.wallets)
        .filter(wallet => wallet.balance.sat > 0 && wallet.network === network)
        .length > 0,
    [keys, network],
  );

  const currentGroupIdx = Math.max(
    0,
    cardGroups.findIndex(g => g.some(c => c.id === id)),
  );
  const currentGroup = cardGroups[currentGroupIdx];
  const activeCard = currentGroup[0];
  const unactivatedCard = currentGroup.find(
    c => c.cardType === 'physical' && isActivationRequired(c),
  );

  const dashboardTransactions = useAppSelector(rootState =>
    selectDashboardTransactions(rootState, activeCard.id),
  );

  const goToCardSettings = () => {
    dispatch(Analytics.track('Clicked Card Settings', {}));

    navigation.navigate('Settings', {
      id: activeCard.id,
    });
  };
  const goToCardSettingsRef = useRef(goToCardSettings);
  goToCardSettingsRef.current = goToCardSettings;

  const goToReferAndEarn = () => {
    dispatch(Analytics.track('Clicked Refer and Earn', {}));

    navigation.navigate('Referral', {card: activeCard});
  };
  const goToReferAndEarnRef = useRef(goToReferAndEarn);
  goToReferAndEarnRef.current = goToReferAndEarn;

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
    dispatch(Analytics.track('Clicked Add Funds', {context: 'CardDashboard'}));
    if (hasWalletsWithBalance) {
      navigator.navigate('Wallet', {
        screen: WalletScreens.AMOUNT,
        params: {
          fiatCurrencyAbbreviation: activeCard.currency.code,
          onAmountSelected: selectedAmount =>
            goToConfirmScreen(+selectedAmount),
        },
      });
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('No funds available'),
          message: t('You do not have any funds to send.'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Add funds'),
              action: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'CardDashboard - No funds availiable',
                  }),
                );
                navigator.navigate('Wallet', {
                  screen: WalletScreens.AMOUNT,
                  params: {
                    onAmountSelected: (amount: string) => {
                      navigator.navigate('BuyCrypto', {
                        screen: BuyCryptoScreens.ROOT,
                        params: {
                          amount: Number(amount),
                        },
                      });
                    },
                    context: 'buyCrypto',
                  },
                });
              },
              primary: true,
            },
            {
              text: t('Got It'),
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
            onPress={() => goToReferAndEarnRef.current()}
            buttonType="pill">
            {t('Earn $10')}
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
  const [autoInitState, setAutoInitState] = useState<Record<string, boolean>>(
    {},
  );
  const uninitializedId = autoInitState[activeCard.id] ? null : activeCard.id;
  const isLoadingInitial = fetchOverviewStatus === 'loading' && !pageData;

  useFocusEffect(
    useCallback(() => {
      if (appWasInit && uninitializedId) {
        setAutoInitState({...autoInitState, [uninitializedId]: true});
        dispatch(CardEffects.startFetchOverview(uninitializedId));
      }
    }, [uninitializedId, autoInitState, dispatch, appWasInit]),
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
            {t(
              'Load your cash account and get instant access to spending at thousands of merchants.',
            )}
          </EmptyListDescription>
        </EmptyListContainer>
      ),
    [t, isLoadingInitial],
  );

  const renderSlide = useCallback(
    ({item}: {item: Card[]}) =>
      activeCard.id === item[0].id ? (
        <SharedElement
          id={'card.dashboard.active-card.' + item[0].id}
          style={{paddingHorizontal: 10}}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => goToCardSettingsRef.current()}>
            <CardOverviewSlide
              card={item[0]}
              designCurrency={virtualDesignCurrency}
            />
          </TouchableOpacity>
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
    dispatch(AppEffects.requestBrazeContentRefresh());
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

  const onActivatePress = useCallback((card: Card) => {
    navigationRef.navigate('CardActivation', {
      screen: 'Activate',
      params: {
        card,
      },
    });
  }, []);

  const additionalContent: {key: string; content: JSX.Element}[] = [];

  if (unactivatedCard) {
    additionalContent.push({
      key: 'shipping-status',
      content: (
        <ShippingStatus
          card={unactivatedCard}
          onActivatePress={onActivatePress}
        />
      ),
    });
  }

  if (brazeCardOffers.length) {
    additionalContent.push({
      key: 'card-offers',
      content: (
        <CardOffersContainer>
          <CardOffers
            contentCard={brazeCardOffers[0]}
            userEmail={user?.email}
          />
        </CardOffersContainer>
      ),
    });
  }

  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);

  return (
    <>
      <FlatList
        contentContainerStyle={{minHeight: '100%'}}
        data={dashboardTransactions}
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
                marginTop: 32,
              }}
            />

            {additionalContent.length ? (
              additionalContent.map(({key, content}) => (
                <CardsRowContainer key={key}>{content}</CardsRowContainer>
              ))
            ) : (
              <BelowCarouselSpacer />
            )}

            {!isLoadingInitial ? (
              <TransactionListHeader>
                <TransactionListHeaderTitle>
                  {dashboardTransactions.length <= 0
                    ? null
                    : t('Recent Activity')}
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
        ref={flatListRef}
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
