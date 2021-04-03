import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import HomeRoot from './Home/HomeStack';
import WalletRoot from './Wallet/WalletStack';
import CardRoot from './Card/CardStack';
import SettingsRoot from './Settings/SettingsStack';

const Tab = createBottomTabNavigator();

const TabsStack = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeRoot} />
      <Tab.Screen name="Wallet" component={WalletRoot} />
      <Tab.Screen name="Card" component={CardRoot} />
      <Tab.Screen name="Settings" component={SettingsRoot} />
    </Tab.Navigator>
  );
};

export default TabsStack;
