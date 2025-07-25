import debounce from 'lodash.debounce';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {Keyboard, RefreshControl, ScrollView} from 'react-native';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getGiftCardConfigList,
  getGiftCardCurations,
  isGiftCardDisplayable,
} from '../../../lib/gift-cards/gift-card';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {ShopOnline} from './components/ShopOnline';
import {CardConfig, Category, GiftCard} from '../../../store/shop/shop.models';
import {ShopEffects} from '../../../store/shop';
import {
  selectCategories,
  selectCategoriesAndCurations,
  selectCategoriesWithIntegrations,
  selectIntegrations,
} from '../../../store/shop-catalog';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ShopScreens, ShopStackParamList} from './ShopStack';
import {useTranslation} from 'react-i18next';
import {useFocusEffect, useScrollToTop} from '@react-navigation/native';
import {HeaderContainer} from '../../tabs/home/components/Styled';
import {HeaderTitle} from '../../../components/styled/Text';
import {HEIGHT} from '../../../components/styled/Containers';
import {useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {withErrorFallback} from '../TabScreenErrorFallback';
import TabContainer from '../TabContainer';

export enum ShopTabs {
  GIFT_CARDS = 'Gift Cards',
  SHOP_ONLINE = 'Shop Online',
}

export type ShopHomeParamList = {
  [ShopTabs.GIFT_CARDS]: undefined;
  [ShopTabs.SHOP_ONLINE]: undefined;
};

const Tab = createMaterialTopTabNavigator();

const ShopInnerContainer = styled.View`
  margin-top: 15px;
`;

const getGiftCardsScrollViewHeight = (
  availableGiftCards: CardConfig[],
  numSelectedGiftCards: number,
  activeGiftCards: GiftCard[],
  curations: any,
) => {
  const activeGiftCardsHeight = activeGiftCards.length * 68 + 260;
  const curationsHeight = curations.length * 320;
  const giftCardItemHeight = 87;
  const giftCardsBottomPadding = 100;
  const searchBarHeight = 150;
  const staticGiftCardScrollViewHeight =
    activeGiftCardsHeight + curationsHeight + searchBarHeight;
  const giftCardListHeight =
    (numSelectedGiftCards || availableGiftCards.length) * giftCardItemHeight +
    giftCardsBottomPadding;
  const minGiftCardCatalogHeight = HEIGHT - 600;
  const giftCardCatalogHeight = Math.max(
    giftCardListHeight,
    minGiftCardCatalogHeight,
  );
  return staticGiftCardScrollViewHeight + giftCardCatalogHeight;
};

const getShopOnlineScrollViewHeight = (categories: Category[]) => {
  return categories.length * 273 + 350;
};

const getScrollViewHeight = (
  activeTab: string,
  integrationsCategories: Category[],
  availableGiftCards: CardConfig[],
  numSelectedGiftCards: number,
  activeGiftCards: GiftCard[],
  curations: any,
) => {
  return activeTab === ShopTabs.GIFT_CARDS
    ? getGiftCardsScrollViewHeight(
        availableGiftCards,
        numSelectedGiftCards,
        activeGiftCards,
        curations,
      )
    : getShopOnlineScrollViewHeight(integrationsCategories);
};

const ShopHome: React.FC<
  NativeStackScreenProps<ShopStackParamList, ShopScreens.HOME>
> = ({route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const availableCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.availableCardMap,
  );
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );

  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const giftCards = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  ) as GiftCard[];
  const purchasedGiftCards = useMemo(
    () =>
      giftCards.filter(giftCard =>
        isGiftCardDisplayable(giftCard, supportedCardMap),
      ),
    [giftCards, supportedCardMap],
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

  const curations = useMemo(
    () =>
      getGiftCardCurations(
        availableGiftCards,
        categoriesAndCurations,
        purchasedGiftCards,
      ),
    [availableGiftCards, categoriesAndCurations, purchasedGiftCards],
  );

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
        supportedGiftCardMap={supportedCardMap}
        curations={curations}
        categories={categoriesWithGiftCards}
        onSelectedGiftCardsChange={newNumSelectedGiftCards =>
          setNumSelectedGiftCards(newNumSelectedGiftCards)
        }
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableGiftCards, categories, curations, supportedCardMap].map(obj =>
      JSON.stringify(obj),
    ),
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
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!initialSyncComplete) {
        dispatch(ShopEffects.startSyncGiftCards());
        setInitialSyncComplete(true);
      }
    }, [initialSyncComplete]),
  );

  return (
    <TabContainer>
      <HeaderContainer>
        <HeaderTitle>{t('Pay with Crypto')}</HeaderTitle>
      </HeaderContainer>
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
              fontSize: 16,
              marginHorizontal: 5,
              numTabs: 2,
              tabWidth: 120,
              langAdjustments: true,
            })}
            screenListeners={{
              tabPress: tab => {
                if (tab.target) {
                  setActiveTab(
                    tab.target.includes(ShopTabs.GIFT_CARDS)
                      ? ShopTabs.GIFT_CARDS
                      : ShopTabs.SHOP_ONLINE,
                  );
                }
              },
            }}>
            <Tab.Screen
              name={t('Gift Cards')}
              component={memoizedGiftCardCatalog}
            />
            <Tab.Screen
              name={t('Shop Online')}
              component={memoizedShopOnline}
            />
          </Tab.Navigator>
        </ShopInnerContainer>
      </ScrollView>
    </TabContainer>
  );
};

export default withErrorFallback(ShopHome);
