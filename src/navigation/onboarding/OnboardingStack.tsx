import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
  headerRightContainerStyle,
} from '../../constants/NavigationOptions';
import {useNavigation} from '@react-navigation/native';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import OnboardingStartScreen from './screens/OnboardingStart';
import PinScreen from './screens/Pin';
import CreateWallet from './screens/CreateWallet';
import TermsOfUse from './screens/TermsOfUse';
import SelectAssets from '../wallet/SelectAssets';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../store/app';
import {BottomNotifications} from '../../constants/bottom-notifications';
import Backup from '../wallet/Backup';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  Pin: undefined;
  CreateWallet: undefined;
  TermsOfUse: {
    context?: 'skip' | undefined;
  };
  SelectAssets: undefined;
  BackupWallet: undefined;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  PIN = 'Pin',
  CREATE_WALLET = 'CreateWallet',
  TERMS_OF_USE = 'TermsOfUse',
  SELECT_ASSETS = 'SelectAssets',
  BACKUP_WALLET = 'BackupWallet',
}

const Onboarding = createStackNavigator<OnboardingStackParamList>();

const OnboardingStack = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  return (
    <Onboarding.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('BitpayId', {
                  screen: 'LoginSignup',
                  params: {context: 'login'},
                });
              }}>
              Log In
            </Button>
          ),
        }}
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'CreateWallet',
                });
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.PIN}
        component={PinScreen}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'TermsOfUse',
                  params: {
                    context: 'skip',
                  },
                });
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.CREATE_WALLET}
        component={CreateWallet}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerRight: () => null,
        }}
        name={OnboardingScreens.TERMS_OF_USE}
        component={TermsOfUse}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'TermsOfUse',
                  params: {
                    context: 'skip',
                  },
                });
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.SELECT_ASSETS}
        component={SelectAssets}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={async () => {
                haptic('impactLight');
                await dispatch(
                  AppActions.showBottomNotificationModal(
                    BottomNotifications.BACKUP_KEY,
                  ),
                );
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.BACKUP_WALLET}
        component={Backup}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
