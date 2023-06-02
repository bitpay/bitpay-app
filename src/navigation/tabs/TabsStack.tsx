import React from 'react';
import {View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigatorScreenParams, useTheme} from '@react-navigation/native';

import HomeRoot from './home/HomeRoot';
import ShopRoot, {ShopStackParamList} from './shop/ShopStack';
import SettingsRoot from './settings/SettingsStack';
import {SettingsStackParamList} from './settings/SettingsStack';
import CardStack, {CardStackParamList} from '../card/CardStack';

import {SvgProps} from 'react-native-svg';
import HomeIcon from '../../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../../assets/img/tab-icons/home-focused.svg';
import ShopIcon from '../../../assets/img/tab-icons/shop.svg';
import ShopFocusedIcon from '../../../assets/img/tab-icons/shop-focused.svg';
import CardIcon from '../../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../../assets/img/tab-icons/settings-focused.svg';
import TransactButtonIcon from '../../../assets/img/tab-icons/transact-button.svg';

import {useAndroidBackHandler} from 'react-navigation-backhandler';
import TransactModal from '../../components/modal/transact-menu/TransactMenu';

const Icons: Record<string, React.FC<SvgProps>> = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Shop: ShopIcon,
  ShopFocused: ShopFocusedIcon,
  Card: CardIcon,
  CardFocused: CardFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
  TransactButton: TransactButtonIcon,
};

export enum TabsScreens {
  HOME = 'Home',
  SHOP = 'Shop',
  TRANSACT_BUTTON = 'TransactButton',
  CARD = 'Card',
  SETTINGS = 'Settings',
  CAMERA = 'Camera',
}

export type TabsStackParamList = {
  Home: undefined;
  Shop: NavigatorScreenParams<ShopStackParamList> | undefined;
  TransactButton: undefined;
  Card: NavigatorScreenParams<CardStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
  Camera: undefined;
};

const Tab = createBottomTabNavigator<TabsStackParamList>();

const TabsStack = () => {
  const theme = useTheme();
  useAndroidBackHandler(() => true);
  const TransactionButton = () => null;
  return (
    <Tab.Navigator
      initialRouteName={TabsScreens.HOME}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          minHeight: 68,
        },
        tabBarItemStyle: {
          minHeight: 68,
        },
        tabBarShowLabel: false,
        lazy: false,
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;

          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];

          return <Icon />;
        },
      })}>
      <Tab.Screen name={TabsScreens.HOME} component={HomeRoot} />
      <Tab.Screen name={TabsScreens.SHOP} component={ShopRoot} />
      <Tab.Screen
        name={TabsScreens.TRANSACT_BUTTON}
        component={TransactionButton}
        options={{
          tabBarIcon: () => <TransactModal />,
          tabBarButton: props => <View {...props} />,
        }}
      />
      <Tab.Screen name={TabsScreens.CARD} component={CardStack} />
      <Tab.Screen name={TabsScreens.SETTINGS} component={SettingsRoot} />
    </Tab.Navigator>
  );
};

export default TabsStack;
