import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import WalletConnectIntro from './screens/WalletConnectIntro';
import WalletConnectIcon from '../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import WalletConnectStart from './screens/WalletConnectStart';
import {StyleProp, TextStyle} from 'react-native';
import {useTheme} from '@react-navigation/native';
import WalletConnectHome from './screens/WalletConnectHome';

export type WalletConnectStackParamList = {
  Root: undefined;
  WalletConnectStart: undefined;
  WalletConnectHome: undefined;
};

export enum WalletConnectScreens {
  ROOT = 'Root',
  WalletConnectStart = 'WalletConnectStart',
  WalletConnectHome = 'WalletConnectHome',
}

const WalletConnect = createStackNavigator<WalletConnectStackParamList>();

const WalletConnectStack = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <WalletConnect.Navigator
      initialRouteName={WalletConnectScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <WalletConnect.Screen
        name={WalletConnectScreens.ROOT}
        component={WalletConnectIntro}
        options={{
          headerTitle: () => (
            <HeaderTitle style={textStyle}>
              <WalletConnectIcon /> WalletConnect
            </HeaderTitle>
          ),
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WalletConnectStart}
        component={WalletConnectStart}
        options={{
          headerTitle: () => (
            <HeaderTitle style={textStyle}>
              <WalletConnectIcon /> WalletConnect
            </HeaderTitle>
          ),
        }}
      />
      <WalletConnect.Screen
        name={WalletConnectScreens.WalletConnectHome}
        component={WalletConnectHome}
        options={{
          headerTitle: () => (
            <HeaderTitle style={textStyle}>
              <WalletConnectIcon /> WalletConnect
            </HeaderTitle>
          ),
        }}
      />
    </WalletConnect.Navigator>
  );
};

export default WalletConnectStack;
