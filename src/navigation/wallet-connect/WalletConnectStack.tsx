import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import WalletConnectRoot from './screens/WalletConnectRoot';
import WalletConnectIcon from '../../../assets/img/wallet-connect/wallet-connect-icon.svg';

export type WalletConnectStackParamList = {
  Root: undefined;
};

export enum WalletConnectScreens {
  ROOT = 'Root',
}

const WalletConnect = createStackNavigator<WalletConnectStackParamList>();

const WalletConnectStack = () => {
  return (
    <WalletConnect.Navigator
      initialRouteName={WalletConnectScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <WalletConnect.Screen
        name={WalletConnectScreens.ROOT}
        component={WalletConnectRoot}
        options={{
          headerTitle: () => (
            <HeaderTitle>
              <WalletConnectIcon />
              Wallet Connect
            </HeaderTitle>
          ),
        }}
      />
    </WalletConnect.Navigator>
  );
};

export default WalletConnectStack;
