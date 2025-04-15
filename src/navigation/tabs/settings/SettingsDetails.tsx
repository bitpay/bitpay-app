import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {useTheme} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import HeaderBackButton from '../../../components/back/HeaderBackButton';
import General from './components/General';
import Security from './components/Security';
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
import {useTranslation} from 'react-i18next';

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
  ContactsDetails: {contact: any};
  ContactsAdd: undefined;
  ContactsRoot: undefined;
  BitPayIdProfile: undefined;
  Login: undefined;
};

export type SettingsDetailsScreens = keyof SettingsDetailsParamList;

type SettingsDetailsStackParamList = SettingsDetailsParamList;

type SettingsDetailsRouteProp = {
  initialRoute?: SettingsDetailsScreens;
  redirectTo?: string;
};

const Stack = createNativeStackNavigator<SettingsDetailsStackParamList>();

const SettingsDetails = ({
  route,
}: NativeStackScreenProps<
  SettingsDetailsStackParamList,
  keyof SettingsDetailsParamList
> & {
  route: {params?: SettingsDetailsRouteProp};
}) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const {initialRoute, redirectTo} = route.params || {};

  return (
    <Stack.Navigator
      initialRouteName={initialRoute || 'General'}
      screenOptions={() => ({
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleAlign: 'center',
        headerTitle: props => <HeaderTitle {...props} />,
        headerBackTitleVisible: false,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
      })}>
      <Stack.Screen
        name="General"
        component={General}
        options={{
          headerTitle: () => <HeaderTitle>{t('General')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Contacts"
        component={Contacts}
        options={{
          headerTitle: () => <HeaderTitle>{t('Contacts')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Crypto"
        component={Crypto}
        options={{
          headerTitle: () => <HeaderTitle>{t('Crypto')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Wallets & Keys"
        component={WalletsAndKeys}
        options={{
          headerTitle: () => <HeaderTitle>{t('Wallets & Keys')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Security"
        component={Security}
        options={{
          headerTitle: () => <HeaderTitle>{t('Security')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="External Services"
        component={ExternalServices}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('External Services')}</HeaderTitle>
          ),
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{
          headerTitle: () => <HeaderTitle>{t('Notifications')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Connections"
        component={Connections}
        options={{
          headerTitle: () => <HeaderTitle>{t('Connections')}</HeaderTitle>,
        }}
        initialParams={{redirectTo}}
      />
      <Stack.Screen
        name="About BitPay"
        component={About}
        options={{
          headerTitle: () => <HeaderTitle>{t('About BitPay')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Theme"
        component={ThemeSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Theme')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Customize Home"
        component={CustomizeHomeSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Customize Home')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Display Currency"
        component={AltCurrencySettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Display Currency')}</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Language')}</HeaderTitle>,
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsDetails;
