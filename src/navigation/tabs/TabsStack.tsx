import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigatorScreenParams} from '@react-navigation/native';
import {useTheme} from '../../contexts';

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
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {Analytics} from '../../store/analytics/analytics.effects';
import FloatingTabBarBackground from './FloatingTabBarBackground';
import {
  FLOATING_TAB_BAR_HEIGHT,
  getFloatingTabBarBottomOffset,
  getFloatingTabBarWidth,
} from './floatingTabBar';

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

const styles = StyleSheet.create({
  tabButtonCentered: {
    justifyContent: 'center',
  },
  untappedIconDot: {
    height: 5,
    width: 5,
    backgroundColor: '#ff647c',
    position: 'absolute',
    zIndex: 2,
    right: -7,
    top: -4,
    borderRadius: 5,
  },
});

const TransactionButton = () => null;

const DefaultTabBarButton = ({style, ...props}: any) => (
  <TouchableOpacity
    {...props}
    style={[style, styles.tabButtonCentered]}
    activeOpacity={1}
  />
);

const TransactTabBarIcon = () => <TransactModal />;

const TransactTabBarButton = ({style, ...props}: any) => (
  <View {...props} style={[style, styles.tabButtonCentered]} />
);

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
  const {dark} = useTheme();
  const insets = useSafeAreaInsets();
  const {width: windowWidth} = useWindowDimensions();
  const barSideInset = (windowWidth - getFloatingTabBarWidth(windowWidth)) / 2;
  const hasViewedBillsTab = useAppSelector(({APP}) => APP.hasViewedBillsTab);
  useAndroidBackHandler(() => true);

  return (
    <Tab.Navigator
      initialRouteName={TabsScreens.HOME}
      screenOptions={({route}) => ({
        headerShown: false,
        freezeOnBlur: true,
        tabBarBackground: () => <FloatingTabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          start: barSideInset,
          end: barSideInset,
          bottom: getFloatingTabBarBottomOffset(insets.bottom),
          height: FLOATING_TAB_BAR_HEIGHT,
          paddingBottom: 0,
          paddingTop: 0,
          borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        tabBarButton: DefaultTabBarButton,
        tabBarShowLabel: false,
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;
          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];

          return (
            <View>
              {icon === 'Bills' && !hasViewedBillsTab ? (
                <View style={styles.untappedIconDot} />
              ) : null}
              <Icon />
            </View>
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
          tabBarIcon: TransactTabBarIcon,
          tabBarButton: TransactTabBarButton,
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
