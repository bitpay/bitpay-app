import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import OnboardingStartScreen from './screens/OnboardingStart';
import NotificationsScreen from './screens/Notifications';
import PinScreen from './screens/Pin';
import CreateKeyScreen from './screens/CreateKey';
import TermsOfUseScreen, {TermsOfUseParamList} from './screens/TermsOfUse';
import CurrencySelectionScreen, {
  CurrencySelectionParamList,
} from '../wallet/screens/CurrencySelection';
import Backup, {BackupParamList} from '../wallet/screens/Backup';
import RecoveryPhrase, {
  RecoveryPhraseParamList,
} from '../wallet/screens/RecoveryPhrase';
import VerifyPhrase, {
  VerifyPhraseParamList,
} from '../wallet/screens/VerifyPhrase';
import ImportScreen, {ImportParamList} from '../wallet/screens/Import';
import {HeaderBackButton} from '@react-navigation/elements';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  Notifications: undefined;
  Pin: undefined;
  CreateKey: undefined;
  TermsOfUse: TermsOfUseParamList | undefined;
  CurrencySelection: CurrencySelectionParamList;
  BackupKey: BackupParamList;
  RecoveryPhrase: RecoveryPhraseParamList;
  VerifyPhrase: VerifyPhraseParamList;
  Import: ImportParamList;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  NOTIFICATIONS = 'Notifications',
  PIN = 'Pin',
  CREATE_KEY = 'CreateKey',
  TERMS_OF_USE = 'TermsOfUse',
  CURRENCY_SELECTION = 'CurrencySelection',
  BACKUP_KEY = 'BackupKey',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  IMPORT = 'Import',
}

const Onboarding = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingStack = () => {
  return (
    <Onboarding.Navigator
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.NOTIFICATIONS}
        component={NotificationsScreen}
      />
      <Onboarding.Screen name={OnboardingScreens.PIN} component={PinScreen} />
      <Onboarding.Screen
        name={OnboardingScreens.CREATE_KEY}
        component={CreateKeyScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.CURRENCY_SELECTION}
        component={CurrencySelectionScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.BACKUP_KEY}
        component={Backup}
      />
      <Onboarding.Screen
        name={OnboardingScreens.RECOVERY_PHRASE}
        component={RecoveryPhrase}
      />
      <Onboarding.Screen
        name={OnboardingScreens.VERIFY_PHRASE}
        component={VerifyPhrase}
      />
      <Onboarding.Screen
        name={OnboardingScreens.TERMS_OF_USE}
        component={TermsOfUseScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.IMPORT}
        component={ImportScreen}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
