import debounce from 'lodash.debounce';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components/native';
import {Keyboard, RefreshControl, ScrollView} from 'react-native';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getGiftCardConfigList,
  getGiftCardCurations,
} from '../../../lib/gift-cards/gift-card';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {ShopOnline} from './components/ShopOnline';
import {
  BillPayAccount,
  CardConfig,
  Category,
  GiftCard,
} from '../../../store/shop/shop.models';
import {ShopEffects} from '../../../store/shop';
import {
  selectCategories,
  selectCategoriesAndCurations,
  selectCategoriesWithIntegrations,
  selectIntegrations,
} from '../../../store/shop/shop.selectors';
import {APP_NETWORK} from '../../../constants/config';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {StackScreenProps} from '@react-navigation/stack';
import {ShopScreens, ShopStackParamList} from './ShopStack';
import {useTranslation} from 'react-i18next';
import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {Bills} from './components/Bills';
import {HEIGHT} from '../../../components/styled/Containers';

export enum ShopTabs {
  GIFT_CARDS = 'Gift Cards',
  SHOP_ONLINE = 'Shop Online',
  BILLS = 'Pay Bills',
}

export type ShopHomeParamList = {
  [ShopTabs.GIFT_CARDS]: undefined;
  [ShopTabs.SHOP_ONLINE]: undefined;
  [ShopTabs.BILLS]: undefined;
};

const Tab = createMaterialTopTabNavigator();

const ShopContainer = styled.View`
  flex: 1;
`;

const ShopInnerContainer = styled.View`
  margin-top: 15px;
`;

const getGiftCardsScrollViewHeight = (
  availableGiftCards: CardConfig[],
  numSelectedGiftCards: number,
  purchasedCards: GiftCard[],
  curations: any,
) => {
  const activeGiftCards = purchasedCards.filter(giftCard => !giftCard.archived);
  const purchasedBrandsHeight = activeGiftCards.length * 68 + 260;
  const curationsHeight = curations.length * 320;
  const giftCardItemHeight = 87;
  const giftCardsBottomPadding = 100;
  const searchBarHeight = 150;
  const staticGiftCardScrollViewHeight =
    purchasedBrandsHeight + curationsHeight + searchBarHeight;
  const giftCardListHeight =
    (numSelectedGiftCards || availableGiftCards.length) * giftCardItemHeight +
    giftCardsBottomPadding;
  return staticGiftCardScrollViewHeight + giftCardListHeight;
};

const getShopOnlineScrollViewHeight = (categories: Category[]) => {
  return categories.length * 273 + 350;
};

const getBillsScrollViewHeight = (billPayAccounts: BillPayAccount[]) => {
  const billsListHeight = 90 * billPayAccounts.length + 300;
  const topShopTabsHeight = 80;
  const max = Math.max(HEIGHT - topShopTabsHeight, billsListHeight);
  return max;
};

const getScrollViewHeight = (
  activeTab: string,
  integrationsCategories: Category[],
  availableGiftCards: CardConfig[],
  numSelectedGiftCards: number,
  purchasedCards: GiftCard[],
  curations: any,
  billPayAccounts: BillPayAccount[],
) => {
  return activeTab === ShopTabs.GIFT_CARDS
    ? getGiftCardsScrollViewHeight(
        availableGiftCards,
        numSelectedGiftCards,
        purchasedCards,
        curations,
      )
    : activeTab === ShopTabs.BILLS
    ? getBillsScrollViewHeight(billPayAccounts)
    : getShopOnlineScrollViewHeight(integrationsCategories);
};

const ShopHome: React.FC<
  StackScreenProps<ShopStackParamList, ShopScreens.HOME>
> = ({route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const availableCardMap = useAppSelector(({SHOP}) => SHOP.availableCardMap);
  const supportedCardMap = useAppSelector(({SHOP}) => SHOP.supportedCardMap);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[APP_NETWORK]);
  const giftCards = useAppSelector(
    ({SHOP}) => SHOP.giftCards[APP_NETWORK],
  ) as GiftCard[];
  const billPayAccounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[APP_NETWORK],
  ) as BillPayAccount[];
  const purchasedGiftCards = useMemo(
    () => giftCards.filter(giftCard => giftCard.status !== 'UNREDEEMED'),
    [giftCards],
  );
  const activeGiftCards = useMemo(
    () => purchasedGiftCards.filter(giftCard => !giftCard.archived),
    [purchasedGiftCards],
  );
  const categoriesAndCurations = useAppSelector(selectCategoriesAndCurations);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  const availableGiftCards = useMemo(
    () =>
      getGiftCardConfigList(availableCardMap).filter(config => !config.hidden),
    [availableCardMap],
  );
  const supportedGiftCards = useMemo(
    () => getGiftCardConfigList(supportedCardMap || availableCardMap),
    [supportedCardMap, availableCardMap],
  );
  const navigation = useNavigation();

  const curations = useMemo(
    () =>
      getGiftCardCurations(
        availableGiftCards,
        categoriesAndCurations,
        purchasedGiftCards,
      ),
    [availableGiftCards, categoriesAndCurations, purchasedGiftCards],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerTitle: () => <HeaderTitle>{t('Pay with Crypto')}</HeaderTitle>,
    });
  }, [navigation, t]);
  const integrations = useAppSelector(selectIntegrations);
  const categories = useAppSelector(selectCategories);
  const categoriesWitIntegrations = useAppSelector(
    selectCategoriesWithIntegrations,
  );

  const categoriesWithGiftCards = categories
    .map(category => ({
      ...category,
      giftCards: availableGiftCards.filter(cardConfig =>
        category.tags.some((tag: string) =>
          (cardConfig.tags || []).includes(tag),
        ),
      ),
    }))
    .filter(category => category.giftCards.length);

  const [numSelectedGiftCards, setNumSelectedGiftCards] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(() =>
    getScrollViewHeight(
      ShopTabs.GIFT_CARDS,
      categoriesWitIntegrations,
      availableGiftCards,
      0,
      activeGiftCards,
      curations,
      billPayAccounts,
    ),
  );

  const [activeTab, setActiveTab] = useState(ShopTabs.GIFT_CARDS);
  const [refreshing, setRefreshing] = useState(false);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  const memoizedGiftCardCatalog = useCallback(
    () => (
      <GiftCardCatalog
        scrollViewRef={scrollViewRef}
        availableGiftCards={availableGiftCards}
        supportedGiftCards={supportedGiftCards}
        curations={curations}
        categories={categoriesWithGiftCards}
        onSelectedGiftCardsChange={newNumSelectedGiftCards =>
          setNumSelectedGiftCards(newNumSelectedGiftCards)
        }
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableGiftCards, categories, curations].map(obj => JSON.stringify(obj)),
  );

  const memoizedShopOnline = useCallback(
    () => (
      <ShopOnline
        scrollViewRef={scrollViewRef}
        integrations={integrations}
        categories={categoriesWitIntegrations}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [integrations].map(obj => JSON.stringify(obj)),
  );

  const dispatch = useAppDispatch();
  const memoizedBills = useCallback(() => <Bills />, []);

  useEffect(() => {
    dispatch(ShopEffects.startFetchCatalog());
    dispatch(ShopEffects.retryGiftCardRedemptions());
  }, [dispatch]);

  useEffect(() => {
    if (route.params?.screen) {
      setActiveTab(route.params.screen);
    }
  }, [route.params?.screen]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetScrollViewHeight = useCallback(
    debounce(newScrollViewHeight => {
      setScrollViewHeight(newScrollViewHeight);
    }, 600),
    [],
  );

  useEffect(() => {
    debouncedSetScrollViewHeight(
      getScrollViewHeight(
        activeTab,
        categoriesWitIntegrations,
        availableGiftCards,
        numSelectedGiftCards,
        activeGiftCards,
        curations,
        billPayAccounts,
      ),
    );
  }, [
    numSelectedGiftCards,
    debouncedSetScrollViewHeight,
    activeTab,
    categoriesWitIntegrations,
    availableGiftCards,
    activeGiftCards,
    curations,
    billPayAccounts,
  ]);

  useFocusEffect(() => {
    dispatch(Analytics.track('Viewed Shop Tab', undefined));
    if (!initialSyncComplete) {
      dispatch(ShopEffects.startSyncGiftCards());
      dispatch(ShopEffects.startGetBillPayAccounts()).catch(_ => {});
      setInitialSyncComplete(true);
    }
  });

  return (
    <ShopContainer>
      <ScrollView
        ref={scrollViewRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={
          user ? (
            <RefreshControl
              tintColor={theme.dark ? White : SlateDark}
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await Promise.all([
                  dispatch(ShopEffects.startSyncGiftCards()),
                  dispatch(ShopEffects.startGetBillPayAccounts()).catch(
                    _ => {},
                  ),
                  sleep(600),
                ]);
                setRefreshing(false);
              }}
            />
          ) : undefined
        }>
        <ShopInnerContainer>
          <Tab.Navigator
            style={{
              height: scrollViewHeight,
            }}
            screenOptions={ScreenOptions({
              fontSize: 15,
              marginHorizontal: 3,
              numTabs: 3,
              tabWidth: 111,
            })}
            screenListeners={{
              tabPress: tab => {
                if (tab.target) {
                  setActiveTab(
                    tab.target.includes(ShopTabs.GIFT_CARDS)
                      ? t('Gift Cards')
                      : tab.target.includes(ShopTabs.BILLS)
                      ? t('Pay Bills')
                      : t('Shop Online'),
                  );
                  if (tab.target.includes(ShopTabs.BILLS)) {
                    dispatch(
                      Analytics.track('Bill Pay - Clicked Bill Pay', {
                        context: 'Shop Tab',
                      }),
                    );
                  }
                }
              },
            }}>
            <Tab.Screen
              name={ShopTabs.GIFT_CARDS}
              component={memoizedGiftCardCatalog}
            />
            <Tab.Screen
              name={ShopTabs.SHOP_ONLINE}
              component={memoizedShopOnline}
            />
            <Tab.Screen name={ShopTabs.BILLS} component={memoizedBills} />
          </Tab.Navigator>
        </ShopInnerContainer>
      </ScrollView>
    </ShopContainer>
  );
};

export default ShopHome;
