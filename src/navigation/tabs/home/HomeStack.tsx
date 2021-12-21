import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import HomeRoot from './HomeRoot';
import styled from 'styled-components/native';
import ProfileSvg from '../../../../assets/img/home/profile.svg';
import ScanSvg from '../../../../assets/img/home/scan.svg';
import {ScreenGutter} from '../../../components/styled/Containers';
import ImportWalletScreen from '../../wallet/screens/ImportWallet';
import SelectAssetsScreen from '../../wallet/screens/SelectAssets';
import {HeaderTitle} from '../../../components/styled/Text';

export type HomeStackParamList = {
  Root: undefined;
  SelectAssets: undefined;
  ImportWallet: undefined;
};

export enum HomeScreens {
  Root = 'Root',
  SELECT_ASSETS = 'SelectAssets',
  IMPORT_WALLET = 'ImportWallet',
}

const HeaderContainer = styled.View`
  flex-direction: row;
  margin: 0 ${ScreenGutter};
`;

const ScanImg = styled.View`
  margin-right: ${ScreenGutter};
`;

const Home = createStackNavigator<HomeStackParamList>();

const HomeStack = () => {
  //  TODO: Update me
  const HeaderRightComponent = (
    <HeaderContainer>
      <ScanImg>
        <ScanSvg />
      </ScanImg>
      <ProfileSvg />
    </HeaderContainer>
  );

  return (
    <Home.Navigator
      initialRouteName={HomeScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Home.Screen
        name={HomeScreens.Root}
        component={HomeRoot}
        options={{
          headerLeft: () => null,
          headerTitle: () => null,
          headerRight: () => HeaderRightComponent,
        }}
      />
      <Home.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Select Assets</HeaderTitle>,
          headerTitleAlign: 'center',
        }}
        name={HomeScreens.SELECT_ASSETS}
        component={SelectAssetsScreen}
      />
      <Home.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Import Wallet</HeaderTitle>,
          headerTitleAlign: 'center',
        }}
        name={HomeScreens.IMPORT_WALLET}
        component={ImportWalletScreen}
      />
    </Home.Navigator>
  );
};

export default HomeStack;
