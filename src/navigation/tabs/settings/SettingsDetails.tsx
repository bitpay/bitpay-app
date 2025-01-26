import React from 'react';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import {HeaderBackButton} from '@react-navigation/elements';
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
import {baseNativeHeaderBackButtonProps} from '../../../constants/NavigationOptions';

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
};

const Stack = createNativeStackNavigator<SettingsDetailsStackParamList>();

const SettingsDetails = ({
  route,
}: NativeStackScreenProps<SettingsDetailsStackParamList, keyof SettingsDetailsParamList> & {
  route: { params?: SettingsDetailsRouteProp }
}) => {
  const theme = useTheme();
  const { initialRoute } = route.params || {};

  return (
    <Stack.Navigator
      initialRouteName={initialRoute || 'General'}
      screenOptions={({navigation}) => ({
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleAlign: 'center',
        headerTitle: props => <HeaderTitle {...props} />,
        headerBackTitleVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <Stack.Screen name="General" component={General} />
      <Stack.Screen name="Contacts" component={Contacts} />
      <Stack.Screen name="Crypto" component={Crypto} />
      <Stack.Screen name="Wallets & Keys" component={WalletsAndKeys} />
      <Stack.Screen name="Security" component={Security} />
      <Stack.Screen name="External Services" component={ExternalServices} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Connections" component={Connections} />
      <Stack.Screen name="About BitPay" component={About} />
      <Stack.Screen name="Theme" component={ThemeSettings} />
      <Stack.Screen name="Customize Home" component={CustomizeHomeSettings} />
      <Stack.Screen name="Display Currency" component={AltCurrencySettings} />
      <Stack.Screen name="Language" component={LanguageSettings} />
    </Stack.Navigator>
  );
};

export default SettingsDetails;
