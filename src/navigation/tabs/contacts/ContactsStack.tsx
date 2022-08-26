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

export type ContactsStackParamList = {
  Root: undefined;
  ContactsDetails: {contact: ContactRowProps};
  ContactsAdd:
    | {
        contact?: Partial<ContactRowProps>;
        context?: string;
        onEditComplete?: (contact: ContactRowProps) => void;
      }
    | undefined;
};

export enum ContactsScreens {
  ROOT = 'Root',
  DETAILS = 'ContactsDetails',
  ADD = 'ContactsAdd',
}

const Contacts = createStackNavigator<ContactsStackParamList>();

const ContactsStack = () => {
  const {t} = useTranslation();
  return (
    <Contacts.Navigator
      initialRouteName={ContactsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Contacts.Screen name={ContactsScreens.ROOT} component={ContactsRoot} />
      <Contacts.Screen
        name={ContactsScreens.DETAILS}
        component={ContactsDetails}
        options={{
          headerMode: 'screen',
          headerTitle: () => <HeaderTitle>{t('Details')}</HeaderTitle>,
        }}
      />
      <Contacts.Screen
        name={ContactsScreens.ADD}
        component={ContactsAdd}
        options={{
          headerMode: 'screen',
        }}
      />
    </Contacts.Navigator>
  );
};

export default ContactsStack;
