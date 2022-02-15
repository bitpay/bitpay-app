import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import ContactsRoot from './screens/ContactsRoot';
import ContactsDetails from './screens/ContactsDetails';
import ContactsAdd from './screens/ContactsAdd';
import {ContactRowProps} from '../../../components/list/ContactRow';

import {useTranslation} from 'react-i18next';

export type ContactSettingsStackParamList = {
  Root: undefined;
  ContactsDetails: ContactRowProps;
  ContactsAdd: undefined;
};

export enum ContactSettingsScreens {
  ROOT = 'Root',
  CONTACTS_DETAILS = 'ContactsDetails',
  CONTACTS_ADD = 'ContactsAdd',
}

const ContactSettings = createStackNavigator<ContactSettingsStackParamList>();

const ContactSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <ContactSettings.Navigator
      initialRouteName={ContactSettingsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <ContactSettings.Screen
        name={ContactSettingsScreens.ROOT}
        component={ContactsRoot}
        options={{
          headerLeft: () => null,
          headerTitle: () => <HeaderTitle>{t('Contacts')}</HeaderTitle>,
        }}
      />
      <ContactSettings.Screen
        name={ContactSettingsScreens.CONTACTS_DETAILS}
        component={ContactsDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Details')}</HeaderTitle>,
        }}
      />
      <ContactSettings.Screen
        name={ContactSettingsScreens.CONTACTS_ADD}
        component={ContactsAdd}
        options={{
          headerTitle: () => <HeaderTitle>{t('New Contact')}</HeaderTitle>,
        }}
      />
    </ContactSettings.Navigator>
  );
};

export default ContactSettingsStack;
