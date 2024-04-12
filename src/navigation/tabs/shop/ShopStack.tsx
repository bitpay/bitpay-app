import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import ShopHome, {ShopHomeParamList} from './ShopHome';
import {NavigatorScreenParams} from '@react-navigation/native';
import {HeaderBackButton} from '@react-navigation/elements';
import {useTheme} from 'styled-components/native';

export type ShopStackParamList = {
  Home: NavigatorScreenParams<ShopHomeParamList>;
};

export enum ShopScreens {
  HOME = 'Home',
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
}

const Shop = createNativeStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  const theme = useTheme();
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.HOME}
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <Shop.Screen name={ShopScreens.HOME} component={ShopHome} />
    </Shop.Navigator>
  );
};

export default ShopStack;
