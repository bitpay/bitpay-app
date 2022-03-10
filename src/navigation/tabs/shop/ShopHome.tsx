import debounce from 'lodash.debounce';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styled, {css} from 'styled-components/native';
import {Platform, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getCardConfigFromApiConfigMap,
  getGiftCardCurations,
} from '../../../lib/gift-cards/gift-card';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {ShopOnline} from './components/ShopOnline';
import {
  CardConfig,
  Category,
  DirectIntegrationApiObject,
  GiftCard,
} from '../../../store/shop/shop.models';
import {BaseText} from '../../../components/styled/Text';
import {purchasedGiftCards} from './stubs/gift-cards';
import {ShopEffects} from '../../../store/shop';

enum ShopTabs {
  GIFT_CARDS = 'Gift Cards',
  SHOP_ONLINE = 'Shop Online',
}

const Tab = createMaterialTopTabNavigator();

const ShopContainer = styled.View`
  flex: 1;
`;

const ShopHeader = styled(BaseText)`
  font-size: 18px;
  font-weight: 700;
  margin-top: ${Platform.select({
    ios: css`
      20px
    `,
    android: css`
      40px
    `,
  })};
  text-align: center;
  margin-bottom: 30px;
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

const getScrollViewHeight = (
  activeTab: string,
  integrationsCategories: Category[],
  availableGiftCards: CardConfig[],
  numSelectedGiftCards: number,
  purchasedCards: GiftCard[],
  curations: any,
) => {
  return activeTab === ShopTabs.GIFT_CARDS
    ? getGiftCardsScrollViewHeight(
        availableGiftCards,
        numSelectedGiftCards,
        purchasedCards,
        curations,
      )
    : getShopOnlineScrollViewHeight(integrationsCategories);
};

const ShopHome = () => {
  const availableCardMap = useSelector(
    ({SHOP}: RootState) => SHOP.availableCardMap,
  );
  const integrationsMap = useSelector(({SHOP}: RootState) => SHOP.integrations);
  const categoriesAndCurations = useSelector(
    ({SHOP}: RootState) => SHOP.categoriesAndCurations,
  );
  const scrollViewRef = useRef<ScrollView>(null);

  const availableGiftCards = useMemo(
    () => getCardConfigFromApiConfigMap(availableCardMap),
    [availableCardMap],
  );

  const curations = useMemo(
    () => getGiftCardCurations(availableGiftCards, categoriesAndCurations),
    [availableGiftCards, categoriesAndCurations],
  );

  const integrations = useMemo(
    () => Object.values(integrationsMap) as DirectIntegrationApiObject[],
    [integrationsMap],
  );

  const categories = useMemo(
    () => Object.values(categoriesAndCurations.categories) as Category[],
    [categoriesAndCurations.categories],
  );

  const categoriesWitIntegrations = useMemo(
    () =>
      categories
        .map(category => ({
          ...category,
          integrations: integrations.filter(integration =>
            category.tags.some((tag: string) => integration.tags.includes(tag)),
          ),
        }))
        .filter(category => category.integrations.length),
    [categories, integrations],
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
      purchasedGiftCards,
      curations,
    ),
  );

  const [activeTab, setActiveTab] = useState(ShopTabs.GIFT_CARDS);

  const memoizedGiftCardCatalog = useCallback(
    () => (
      <GiftCardCatalog
        scrollViewRef={scrollViewRef}
        availableGiftCards={availableGiftCards}
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

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(ShopEffects.startFetchCatalog());
  }, [dispatch]);

  const insets = useSafeAreaInsets();

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
        purchasedGiftCards,
        curations,
      ),
    );
  }, [
    numSelectedGiftCards,
    debouncedSetScrollViewHeight,
    activeTab,
    categoriesWitIntegrations,
    availableGiftCards,
    curations,
  ]);

  return (
    <ShopContainer
      style={{
        paddingTop: insets.top,
        paddingBottom: 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
      <ScrollView ref={scrollViewRef} keyboardDismissMode="on-drag">
        <ShopHeader>Shop with Crypto</ShopHeader>
        <Tab.Navigator
          style={{
            height: scrollViewHeight,
          }}
          screenOptions={ScreenOptions(112)}
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
            name={ShopTabs.GIFT_CARDS}
            component={memoizedGiftCardCatalog}
          />
          <Tab.Screen
            name={ShopTabs.SHOP_ONLINE}
            component={memoizedShopOnline}
          />
        </Tab.Navigator>
      </ScrollView>
    </ShopContainer>
  );
};

export default ShopHome;
