import React, {useCallback, useEffect, useRef} from 'react';
import styled, {css} from 'styled-components/native';
import {Action, NeutralSlate, SlateDark} from '../../../styles/colors';
import {Dimensions, ScrollView, Platform} from 'react-native';
import {purchasedBrands} from './stubs/gift-cards';
import {BaseText} from '../../../components/styled/Text';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getCardConfigFromApiConfigMap,
  getGiftCardCurations,
} from '../../../lib/gift-cards/gift-card';
import {useDispatch, useSelector} from 'react-redux';
import {startFetchCatalog} from '../../../store/shop/shop.effects';
import {RootState} from '../../../store';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

const HEIGHT = Dimensions.get('window').height;

const Tab = createMaterialTopTabNavigator();

const ShopContainer = styled.SafeAreaView`
  height: 100%;
`;

const ShopHeader = styled.Text`
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
  margin-bottom: 40px;
`;

interface TabTextProps {
  focused: boolean;
}

export const TabText = styled(BaseText)<TabTextProps>`
  ${({focused}) =>
    css`
      font-weight: 600;
      font-size: 17px;
      color: ${focused ? 'white' : 'black'};
    `}
`;

const ShopOnline = () => {
  return <></>;
};

const ShopHome = () => {
  const availableCardMap = useSelector(
    ({SHOP}: RootState) => SHOP.availableCardMap,
  );
  const directory = useSelector(
    ({SHOP}: RootState) => SHOP.categories,
  );
  const availableGiftCards = getCardConfigFromApiConfigMap(availableCardMap);
  const curations = getGiftCardCurations(availableGiftCards, directory);
  const scrollViewRef = useRef<ScrollView>(null);
  const categories = Object.values(directory.categories) as any[];
  const purchasedBrandsHeight = purchasedBrands.length * 68 + 260;
  const curationsHeight = curations.length * 320;
  const categoriesHeight = categories.length * 70;
  const searchBarHeight = 150;
  const scrollViewHeight =
    purchasedBrandsHeight +
    curationsHeight +
    categoriesHeight +
    searchBarHeight;

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

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(startFetchCatalog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ShopContainer>
      <ScrollView
        contentContainerStyle={{
          height: scrollViewHeight,
          minHeight: HEIGHT,
        }}
        ref={scrollViewRef}
        keyboardDismissMode="on-drag">
        <ShopHeader>Shop with Crypto</ShopHeader>
        <Tab.Navigator
          screenOptions={{
            swipeEnabled: false,
            tabBarLabelStyle: {
              fontSize: 16,
              fontWeight: '500',
              textTransform: 'none',
              paddingVertical: 4,
            },
            tabBarActiveTintColor: 'white',
            tabBarInactiveTintColor: SlateDark,
            tabBarPressColor: '#e7e7e7',
            tabBarIndicatorStyle: {
              height: 40,
              borderRadius: 50,
              backgroundColor: Action,
              marginBottom: Platform.select({
                ios: 7,
                android: 8,
              }),
              width: 112,
              marginLeft: 9,
            },
            tabBarStyle: {
              width: 261,
              alignSelf: 'center',
              backgroundColor: NeutralSlate,
              borderRadius: 50,
              elevation: 0,
            },
          }}>
          <Tab.Screen name="Gift Cards" component={memoizedGiftCardCatalog} />
          <Tab.Screen name="Shop Online" component={ShopOnline} />
        </Tab.Navigator>
      </ScrollView>
    </ShopContainer>
  );
};

export default ShopHome;
