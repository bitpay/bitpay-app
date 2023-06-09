import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigatorScreenParams, useTheme} from '@react-navigation/native';
import {TransitionPresets} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {useAndroidBackHandler} from 'react-navigation-backhandler';

import HomeRoot from './home/HomeRoot';
import ShopHome, {ShopHomeParamList} from './shop/ShopHome';
import SettingsRoot, {SettingsHomeParamList} from './settings/SettingsRoot';
import CardHome, {CardHomeScreenParamList} from '../../navigation/card/screens/CardHome';

import HomeIcon from '../../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../../assets/img/tab-icons/home-focused.svg';
import ShopIcon from '../../../assets/img/tab-icons/shop.svg';
import ShopFocusedIcon from '../../../assets/img/tab-icons/shop-focused.svg';
import CardIcon from '../../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../../assets/img/tab-icons/settings-focused.svg';
import TransactButtonIcon from '../../../assets/img/tab-icons/transact-button.svg';
import TransactModal from '../../components/modal/transact-menu/TransactMenu';
import {WIDTH} from '../../components/styled/Containers';
import {HeaderTitle, ZeroHeightHeader} from '../../components/styled/Text';

const Icons: Record<string, React.FC<SvgProps>> = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Shop: ShopIcon,
  ShopFocused: ShopFocusedIcon,
  CardTab: CardIcon,
  CardTabFocused: CardFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
  TransactButton: TransactButtonIcon,
};

export enum TabsScreens {
  HOME = 'Home',
  SHOP = 'Shop',
  TRANSACT_BUTTON = 'TransactButton',
  CARD = 'CardTab',
  SETTINGS = 'Settings',
  CAMERA = 'Camera',
}

export type TabsStackParamList = {
  Home: undefined;
  Shop: NavigatorScreenParams<ShopHomeParamList> | undefined;
  TransactButton: undefined;
  CardTab: CardHomeScreenParamList | undefined;
  Settings: SettingsHomeParamList | undefined;
  Camera: undefined;
};

const Tab = createBottomTabNavigator<TabsStackParamList>();

const TabsStack = () => {
  const theme = useTheme();
  const {t} = useTranslation();

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
      <Tab.Screen name={TabsScreens.HOME} component={HomeRoot} options={{
        headerShown: true,
        header: () => <ZeroHeightHeader />,
      }} />
      <Tab.Screen name={TabsScreens.SHOP} component={ShopHome} options={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerShadowVisible: false,
        headerTitleStyle: {maxWidth: WIDTH - 150},
        ...TransitionPresets.SlideFromRightIOS,
        headerShown: true,
        headerLeft: () => null,
        headerTitle: () => <HeaderTitle>{t('Shop with crypto')}</HeaderTitle>,
      }} />
      <Tab.Screen
        name={TabsScreens.TRANSACT_BUTTON}
        component={TransactionButton}
        options={{
          tabBarIcon: () => <TransactModal />,
          tabBarButton: props => <View {...props} />,
        }}
      />
      <Tab.Screen name={TabsScreens.CARD} component={CardHome} options={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: 'transparent'
        },
        headerShadowVisible: false,
        headerTitleStyle: {maxWidth: WIDTH - 150},
        ...TransitionPresets.SlideFromRightIOS,
        headerLeft: () => null,
      }} />
      <Tab.Screen name={TabsScreens.SETTINGS} component={SettingsRoot} options={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: 'transparent'
        },
        headerShadowVisible: false,
        headerTitleStyle: {maxWidth: WIDTH - 150},
        ...TransitionPresets.SlideFromRightIOS,
        headerShown: true,
        headerLeft: () => null,
        headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
      }} />
    </Tab.Navigator>
  );
};

export default TabsStack;
