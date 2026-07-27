import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {useTheme} from '../../../contexts';
import {useTranslation} from 'react-i18next';
import General from './components/General';
import SecurityHome from './security/screens/SecurityHome';
import VerifyIdentityScreen from '../../bitpay-id/screens/VerifyIdentity';
import Notifications from './components/Notifications';
import Connections from './components/Connections';
import ExternalServices from './components/ExternalServices';
import About from './components/About';
import Contacts from './components/Contacts';
import Crypto from './components/Crypto';
import WalletsAndKeys from './components/WalletsAndKeys';
import ThemeSettings from './general/screens/Theme';
import CustomizeHomeSettings from './general/screens/customize-home/CustomizeHome';
import AltCurrencySettings from './general/screens/AltCurrencySettings';
import LanguageSettings from './general/screens/LanguageSettings';
import MoonpayConnectionSettings from './components/MoonpayConnectionSettings';
import {useStackScreenOptions} from '../../../navigation/utils/headerHelpers';
import type {SettingsGroupParamList} from './SettingsGroup';

export type SettingsDetailsParamList = {
  General: undefined;
  Contacts: undefined;
  Crypto: undefined;
  'Wallets & Keys': undefined;
  Security: undefined;
  'External Services': undefined;
  Notifications: undefined;
  Connections: {redirectTo?: string};
  'About BitPay': undefined;
  'Customize Home': undefined;
  'Display Currency': undefined;
  Language: undefined;
  Theme: undefined;
  MoonpayConnectionSettings: undefined;
  ContactsDetails: {contact: any};
  ContactsAdd: undefined;
  ContactsRoot: undefined;
  BitPayIdProfile: undefined;
  Login: undefined;
  KycVerification: undefined;
};

export type SettingsDetailsScreens = keyof SettingsDetailsParamList;

type SettingsDetailsStackParamList = SettingsDetailsParamList;

const Stack = createNativeStackNavigator<SettingsDetailsStackParamList>();

const SettingsDetails = ({
  route,
}: NativeStackScreenProps<SettingsGroupParamList, 'SettingsDetails'>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const commonOptions = useStackScreenOptions(theme);
  const {initialRoute, redirectTo} = route.params || {};
  const screenOptions = React.useMemo<NativeStackNavigationOptions>(
    () => ({
      ...commonOptions,
      freezeOnBlur: true,
    }),
    [commonOptions],
  );

  return (
    <Stack.Navigator
      initialRouteName={initialRoute || 'General'}
      screenOptions={screenOptions}>
      <Stack.Screen
        name="General"
        component={General}
        options={{title: t('General')}}
      />
      <Stack.Screen
        name="Contacts"
        component={Contacts}
        options={{title: t('Contacts')}}
      />
      <Stack.Screen
        name="Crypto"
        component={Crypto}
        options={{title: t('Crypto')}}
      />
      <Stack.Screen
        name="Wallets & Keys"
        component={WalletsAndKeys}
        options={{title: t('Wallets & Keys')}}
      />
      <Stack.Screen
        name="Security"
        component={SecurityHome}
        options={{title: t('Security')}}
      />
      <Stack.Screen
        name="KycVerification"
        component={VerifyIdentityScreen}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Identity Verification')}</HeaderTitle>
          ),
        }}
      />
      <Stack.Screen
        name="External Services"
        component={ExternalServices}
        options={{title: t('External Services')}}
      />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{title: t('Notifications')}}
      />
      <Stack.Screen
        name="Connections"
        component={Connections}
        options={{title: t('Connections')}}
        initialParams={{redirectTo}}
      />
      <Stack.Screen
        name="About BitPay"
        component={About}
        options={{title: t('About BitPay')}}
      />
      <Stack.Screen
        name="Theme"
        component={ThemeSettings}
        options={{title: t('Theme')}}
      />
      <Stack.Screen
        name="Customize Home"
        component={CustomizeHomeSettings}
        options={{title: t('Customize Home')}}
      />
      <Stack.Screen
        name="Display Currency"
        component={AltCurrencySettings}
        options={{title: t('Display Currency')}}
      />
      <Stack.Screen
        name="Language"
        component={LanguageSettings}
        options={{title: t('Language')}}
      />
      <Stack.Screen
        name="MoonpayConnectionSettings"
        component={MoonpayConnectionSettings}
        options={{title: 'MoonPay'}}
      />
    </Stack.Navigator>
  );
};

export default SettingsDetails;
