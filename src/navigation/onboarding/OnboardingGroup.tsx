import React from 'react';
import OnboardingStartScreen from './screens/OnboardingStart';
import NotificationsScreen from './screens/Notifications';
import PinScreen from './screens/Pin';
import CreateOrImportKey from './screens/CreateKey';
import {TermsOfUseParamList} from './screens/TermsOfUse';
import {CurrencySelectionParamList} from '../wallet/screens/CurrencySelection';
import {BackupParamList} from '../wallet/screens/Backup';
import {RecoveryPhraseParamList} from '../wallet/screens/RecoveryPhrase';
import {VerifyPhraseParamList} from '../wallet/screens/VerifyPhrase';
import {ImportParamList} from '../wallet/screens/Import';
import {Root} from '../../Root';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';

interface OnboardingProps {
  Onboarding: typeof Root;
}

export type OnboardingGroupParamList = {
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

const OnboardingStack: React.FC<OnboardingProps> = ({Onboarding}) => {
  return (
    <Onboarding.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
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
        component={CreateOrImportKey}
      />
    </Onboarding.Group>
  );
};

export default OnboardingStack;
