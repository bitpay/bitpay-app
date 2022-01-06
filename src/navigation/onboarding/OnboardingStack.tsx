import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {useNavigation} from '@react-navigation/native';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import OnboardingStartScreen, {
  OnboardingStartParamList,
} from './screens/OnboardingStart';
import NotificationsScreen from './screens/Notifications';
import PinScreen from './screens/Pin';
import CreateWalletScreen from './screens/CreateWallet';
import TermsOfUseScreen from './screens/TermsOfUse';
import SelectAssetsScreen from '../wallet/screens/SelectAssets';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../store/app';
import Backup from '../wallet/screens/Backup';
import RecoveryPhrase, {
  RecoveryPhraseProps,
} from '../wallet/screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseProps} from '../wallet/screens/VerifyPhrase';
import {HeaderRightContainer} from '../../components/styled/Containers';
import {HeaderTitle} from '../../components/styled/Text';
import ImportWalletScreen, {
  ImportWalletProps,
} from '../wallet/screens/ImportWallet';
export type OnboardingStackParamList = {
  OnboardingStart: OnboardingStartParamList;
  Notifications: undefined;
  Pin: undefined;
  CreateWallet: undefined;
  TermsOfUse:
    | {
        context?: 'skip' | undefined;
      }
    | undefined;
  SelectAssets: undefined;
  BackupWallet: undefined;
  RecoveryPhrase: RecoveryPhraseProps;
  VerifyPhrase: VerifyPhraseProps;
  ImportWallet: ImportWalletProps;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  NOTIFICATIONS = 'Notifications',
  PIN = 'Pin',
  CREATE_WALLET = 'CreateWallet',
  TERMS_OF_USE = 'TermsOfUse',
  SELECT_ASSETS = 'SelectAssets',
  BACKUP_WALLET = 'BackupWallet',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  IMPORT_WALLET = 'ImportWallet',
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
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  navigation.navigate('Auth', {
                    screen: 'LoginSignup',
                    params: {context: 'login'},
                  });
                }}>
                Log In
              </Button>
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  navigation.navigate('Onboarding', {
                    screen: 'Pin',
                  });
                }}>
                Skip
              </Button>
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.NOTIFICATIONS}
        component={NotificationsScreen}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
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
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.PIN}
        component={PinScreen}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
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
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.CREATE_WALLET}
        component={CreateWalletScreen}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Select Assets</HeaderTitle>,
          headerTitleAlign: 'center',
          headerRight: () => (
            <HeaderRightContainer>
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
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.SELECT_ASSETS}
        component={SelectAssetsScreen}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={async () => {
                  haptic('impactLight');
                  dispatch(
                    AppActions.showBottomNotificationModal({
                      type: 'warning',
                      title: 'Are you sure?',
                      message:
                        'You will not be able to add funds to your wallet until you backup your recovery phrase.',
                      enableBackdropDismiss: true,
                      actions: [
                        {
                          text: 'BACKUP YOUR KEY',
                          action: rootState => {
                            const key = rootState.WALLET.keys[0];
                            const {id, mnemonic} = key;
                            navigation.navigate('Onboarding', {
                              screen: 'RecoveryPhrase',
                              params: {
                                keyId: id,
                                words: mnemonic.trim().split(' '),
                                isOnboarding: true,
                              },
                            });
                          },
                          primary: true,
                        },
                        {
                          text: 'LATER',
                          action: () =>
                            navigation.navigate('Onboarding', {
                              screen: 'TermsOfUse',
                            }),
                        },
                      ],
                    }),
                  );
                }}>
                Skip
              </Button>
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.BACKUP_WALLET}
        component={Backup}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Recovery Phrase</HeaderTitle>,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    AppActions.showBottomNotificationModal({
                      type: 'warning',
                      title: 'Don’t risk losing your money',
                      message:
                        'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in the order they appear.',
                      enableBackdropDismiss: true,
                      actions: [
                        {
                          text: "I'M SURE",
                          action: () =>
                            navigation.navigate('Onboarding', {
                              screen: 'TermsOfUse',
                            }),
                          primary: true,
                        },
                      ],
                    }),
                  );
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.RECOVERY_PHRASE}
        component={RecoveryPhrase}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Verify your Phrase</HeaderTitle>,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    AppActions.showBottomNotificationModal({
                      type: 'warning',
                      title: 'Don’t risk losing your money',
                      message:
                        'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in order they appear.',
                      enableBackdropDismiss: true,
                      actions: [
                        {
                          text: "I'M SURE",
                          action: () =>
                            navigation.navigate('Onboarding', {
                              screen: 'TermsOfUse',
                            }),
                          primary: true,
                        },
                      ],
                    }),
                  );
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
        name={OnboardingScreens.VERIFY_PHRASE}
        component={VerifyPhrase}
      />
      <Onboarding.Screen
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>Terms of Use</HeaderTitle>,
          headerLeft: () => null,
          headerRight: () => null,
        }}
        name={OnboardingScreens.TERMS_OF_USE}
        component={TermsOfUseScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.IMPORT_WALLET}
        component={ImportWalletScreen}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
