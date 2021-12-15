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
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { AppActions } from '../../../store/app';

export type HomeStackParamList = {
  Root: undefined;
};

export enum HomeScreens {
  Root = 'Root',
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

  const dispatch = useDispatch();

  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );

  if (!onboardingCompleted) {
    dispatch(AppActions.showOnboardingFinishModal());
  }

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
    </Home.Navigator>
  );
};

export default HomeStack;
