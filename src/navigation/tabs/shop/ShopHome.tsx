import debounce from 'lodash.debounce';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import styled, {css} from 'styled-components/native';
import {Platform, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HEIGHT} from '../../../components/styled/Containers';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getCardConfigFromApiConfigMap,
  getGiftCardCurations,
} from '../../../lib/gift-cards/gift-card';
import {useDispatch, useSelector} from 'react-redux';
import {startFetchCatalog} from '../../../store/shop/shop.effects';
import {RootState} from '../../../store';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {ShopOnline} from './components/ShopOnline';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../store/shop/shop.models';
import {BaseText} from '../../../components/styled/Text';
import {purchasedGiftCards} from './stubs/gift-cards';

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

const ShopHome = () => {
  const availableCardMap = useSelector(
    ({SHOP}: RootState) => SHOP.availableCardMap,
  );
  const integrationsMap = useSelector(({SHOP}: RootState) => SHOP.integrations);
  const categoriesAndCurations = useSelector(
    ({SHOP}: RootState) => SHOP.categoriesAndCurations,
  );
  const scrollViewRef = useRef<ScrollView>(null);

  const availableGiftCards = getCardConfigFromApiConfigMap(availableCardMap);
  const curations = getGiftCardCurations(
    availableGiftCards,
    categoriesAndCurations,
  );
  const integrations = Object.values(
    integrationsMap,
  ) as DirectIntegrationApiObject[];
  const categories = Object.values(
    categoriesAndCurations.categories,
  ) as Category[];
  const categoriesWitIntegrations = categories
    .map(category => ({
      ...category,
      integrations: integrations.filter(integration =>
        category.tags.some((tag: string) => integration.tags.includes(tag)),
      ),
    }))
    .filter(category => category.integrations.length);
  const activeGiftCards = purchasedGiftCards.filter(
    giftCard => !giftCard.archived,
  );

  const purchasedBrandsHeight = activeGiftCards.length * 68 + 260;
  const curationsHeight = curations.length * 320;
  const categoriesHeight = categories.length * 70;
  const searchBarHeight = 150;
  const giftCardScrollViewHeight =
    purchasedBrandsHeight +
    curationsHeight +
    categoriesHeight +
    searchBarHeight;

  const integrationsScrollViewHeight =
    categoriesWitIntegrations.length * 273 + 350;

  const [scrollViewHeight, setScrollViewHeight] = useState(
    giftCardScrollViewHeight,
  );

  const memoizedGiftCardCatalog = useCallback(
    () => (
      <GiftCardCatalog
        scrollViewRef={scrollViewRef}
        availableGiftCards={availableGiftCards}
        curations={curations}
        categories={categories}
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
    dispatch(startFetchCatalog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insets = useSafeAreaInsets();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetScrollViewHeight = useCallback(
    debounce(tabTitle => {
      setScrollViewHeight(
        tabTitle.includes('Gift Cards')
          ? giftCardScrollViewHeight
          : integrationsScrollViewHeight,
      );
    }, 600),
    [],
  );

  return (
    <ShopContainer
      style={{
        paddingTop: insets.top,
        paddingBottom: 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
      <ScrollView
        contentContainerStyle={{
          height: scrollViewHeight,
          minHeight: HEIGHT,
        }}
        ref={scrollViewRef}
        keyboardDismissMode="on-drag">
        <ShopHeader>Shop with Crypto</ShopHeader>
        <Tab.Navigator
          screenOptions={ScreenOptions(112)}
          screenListeners={{
            tabPress: tab => {
              if (tab.target) {
                debouncedSetScrollViewHeight(tab.target);
              }
            },
          }}>
          <Tab.Screen name="Gift Cards" component={memoizedGiftCardCatalog} />
          <Tab.Screen name="Shop Online" component={memoizedShopOnline} />
        </Tab.Navigator>
      </ScrollView>
    </ShopContainer>
  );
};

export default ShopHome;
