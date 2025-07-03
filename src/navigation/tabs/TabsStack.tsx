import React from 'react';
import {View, TouchableOpacity} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigatorScreenParams, useTheme} from '@react-navigation/native';

import HomeRoot from './home/HomeRoot';
import ShopRoot, {ShopStackParamList} from './shop/ShopStack';
import {CardStackParamList} from '../card/CardStack';
import SettingsStack from './settings/SettingsStack';

import {SvgProps} from 'react-native-svg';
import HomeIcon from '../../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../../assets/img/tab-icons/home-focused.svg';
import ShopIcon from '../../../assets/img/tab-icons/shop.svg';
import ShopFocusedIcon from '../../../assets/img/tab-icons/shop-focused.svg';
import BillsIcon from '../../../assets/img/tab-icons/bills.svg';
import BillsFocusedIcon from '../../../assets/img/tab-icons/bills-focused.svg';
import CardIcon from '../../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../../assets/img/tab-icons/settings-focused.svg';
import TransactButtonIcon from '../../../assets/img/tab-icons/transact-button.svg';

import {useAndroidBackHandler} from 'react-navigation-backhandler';
import TransactModal from '../../components/modal/transact-menu/TransactMenu';

import BillStack from './shop/bill/BillStack';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {Analytics} from '../../store/analytics/analytics.effects';

const Icons: Record<string, React.FC<SvgProps>> = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Shop: ShopIcon,
  ShopFocused: ShopFocusedIcon,
  Bills: BillsIcon,
  BillsFocused: BillsFocusedIcon,
  Card: CardIcon,
  CardFocused: CardFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
  TransactButton: TransactButtonIcon,
};

const IconContainer = styled.View``;

const UntappedIconDot = styled.View`
  height: 5px;
  width: 5px;
  background-color: #ff647c;
  position: absolute;
  z-index: 2;
  right: -7px;
  top: -4px;
  border-radius: 5px;
`;

export enum TabsScreens {
  HOME = 'Home',
  SHOP = 'Shop',
  TRANSACT_BUTTON = 'TransactButton',
  BILLS = 'Bills',
  SETTINGS = 'Settings',
  CARD = 'Card',
  CAMERA = 'Camera',
}

export type TabsStackParamList = {
  Home:
    | {
        currencyAbbreviation?: string;
      }
    | undefined;
  Shop: NavigatorScreenParams<ShopStackParamList> | undefined;
  TransactButton: undefined;
  Bills: undefined;
  Card: NavigatorScreenParams<CardStackParamList> | undefined;
  Settings: undefined;
  Camera: undefined;
};

export const Tab = createBottomTabNavigator<TabsStackParamList>();

const TabsStack = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const hasViewedBillsTab = useAppSelector(({APP}) => APP.hasViewedBillsTab);
  useAndroidBackHandler(() => true);
  const TransactionButton = () => null;
  return (
    <Tab.Navigator
      initialRouteName={TabsScreens.HOME}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          height: 60,
          paddingBottom: 0,
          paddingTop: 8,
        },
        tabBarButton: props => (
          <TouchableOpacity {...(props as any)} activeOpacity={1} />
        ),
        tabBarShowLabel: false,
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;
          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];

          return (
            <IconContainer>
              {icon === 'Bills' && !hasViewedBillsTab ? (
                <UntappedIconDot />
              ) : null}
              <Icon />
            </IconContainer>
          );
        },
      })}>
      <Tab.Screen
        name={TabsScreens.HOME}
        component={HomeRoot}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name={TabsScreens.SHOP}
        component={ShopRoot}
        listeners={() => ({
          tabPress: () => dispatch(Analytics.track('Shop - Clicked Shop Tab')),
        })}
      />
      <Tab.Screen
        name={TabsScreens.TRANSACT_BUTTON}
        component={TransactionButton}
        options={{
          tabBarIcon: () => <TransactModal />,
          tabBarButton: props => <View {...props} />,
        }}
      />
      <Tab.Screen
        name={TabsScreens.BILLS}
        component={BillStack}
        listeners={() => ({
          tabPress: () =>
            dispatch(Analytics.track('Bill Pay - Clicked Bill Pay')),
        })}
      />
      <Tab.Screen name={TabsScreens.SETTINGS} component={SettingsStack} />
    </Tab.Navigator>
  );
};

export default TabsStack;
