import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import HomeRoot from '../Home/Home';
import WalletRoot from '../Wallet/Wallet';
import CardRoot from '../Card/Card';
import SettingsRoot from '../Settings/Settings';

const Tab = createBottomTabNavigator();

const Tabs = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeRoot} />
        <Tab.Screen name="Wallet" component={WalletRoot} />
        <Tab.Screen name="Card" component={CardRoot} />
        <Tab.Screen name="Settings" component={SettingsRoot} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default Tabs;
