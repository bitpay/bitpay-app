import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import HomeRoot from './Home/HomeStack';
import WalletRoot from './Wallet/WalletStack';
import CardRoot from './Card/CardStack';
import SettingsRoot from './Settings/SettingsStack';

import HomeIcon from '../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../assets/img/tab-icons/home-focused.svg';
import WalletIcon from '../../assets/img/tab-icons/wallet.svg';
import WalletFocusedIcon from '../../assets/img/tab-icons/wallet-focused.svg';
import CardIcon from '../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../assets/img/tab-icons/settings-focused.svg';

import {SvgProps} from 'react-native-svg';

const Icons: {[key: string]: React.FC<SvgProps>} = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Wallet: WalletIcon,
  WalletFocused: WalletFocusedIcon,
  Card: CardIcon,
  CardFocused: CardFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
};

const Tab = createBottomTabNavigator();

const TabsStack = () => {
  return (
    <Tab.Navigator
      tabBarOptions={{showLabel: false}}
      initialRouteName="Home"
      lazy={true}
      screenOptions={({route}) => ({
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;
          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];
          return <Icon />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeRoot} />
      <Tab.Screen name="Wallet" component={WalletRoot} />
      <Tab.Screen name="Card" component={CardRoot} />
      <Tab.Screen name="Settings" component={SettingsRoot} />
    </Tab.Navigator>
  );
};

export default TabsStack;
