import {useFocusEffect, useScrollToTop} from '@react-navigation/native';
import React, {useCallback, useMemo} from 'react';
import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList} from 'react-native';
// import {SharedElement} from 'react-navigation-shared-element';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';
import GhostImg from '../../../../assets/img/ghost-cheeky.svg';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {Br, ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {Smallest} from '../../../components/styled/Text';
import {CardProvider} from '../../../constants/card';
import {CARD_WIDTH} from '../../../constants/config.card';
import {navigationRef} from '../../../Root';
import {AppEffects} from '../../../store/app';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {selectBrazeCardOffers} from '../../../store/app/app.selectors';
import {CardEffects} from '../../../store/card';
import {Card, UiTransaction} from '../../../store/card/card.models';
import {
  selectCardGroups,
  selectDashboardTransactions,
} from '../../../store/card/card.selectors';
import {isActivationRequired} from '../../../utils/card';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CardHomeScreenProps} from '../screens/CardHome';
import {
  EmptyGhostContainer,
  EmptyListContainer,
  EmptyListDescription,
  TransactionListFooter,
  TransactionListHeader,
  TransactionListHeaderIcon,
  TransactionListHeaderTitle,
} from './CardDashboard.styled';
import CardOffers from './CardOffers';
import CardOverviewSlide from './CardOverviewSlide';
import ShippingStatus from './CardShippingStatus';
import TransactionRow from './CardTransactionRow';
import {AddFundsButton} from './AddFundsButton';

interface CardDashboardProps extends CardHomeScreenProps {
  id: string;
}

const CardsRowContainer = styled.View``;

const CardOffersContainer = styled.View``;

const BelowCarouselSpacer = styled.View``;

const CardDashboard: React.FC<CardDashboardProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {id, navigation} = props;
  const carouselRef = useRef<ICarouselInstance>(null);
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
  const brazeCardOffers = useAppSelector(selectBrazeCardOffers);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);

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

  const addFundsOnClick = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('UnableToAddFunds'),
        message: t('CardBalanceReturnWarningJune2023'),
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {},
        actions: [
          {
            text: t('GOT IT'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

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
        <></>
      ) : (
        // <SharedElement
        //   id={'card.dashboard.active-card.' + item[0].id}
        //   style={{paddingHorizontal: 10}}>
        //   <TouchableOpacity
        //     activeOpacity={1}
        //     onPress={() => goToCardSettingsRef.current()}>
        //     <CardOverviewSlide
        //       card={item[0]}
        //       designCurrency={virtualDesignCurrency}
        //     />
        //   </TouchableOpacity>
        // </SharedElement>
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
    navigationRef.navigate('CardActivate', {
      card,
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
            <Carousel
              mode="parallax"
              modeConfig={{
                parallaxScrollingScale: 1,
                parallaxScrollingOffset: 0,
                parallaxAdjacentItemScale: 0.9,
              }}
              style={{
                width: WIDTH,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              loop={false}
              vertical={false}
              width={CARD_WIDTH + 20}
              height={Math.round(CARD_WIDTH) / 1.5}
              autoPlay={false}
              data={cardGroups}
              ref={carouselRef}
              scrollAnimationDuration={1000}
              enabled={true}
              onSnapToItem={idx => {
                navigation.setParams({
                  id: cardGroups[idx][0].id,
                });
              }}
              renderItem={renderSlide}
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
      <AddFundsButton disabled={true} onPress={addFundsOnClick} />
    </>
  );
};

export default CardDashboard;
