import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import ContactsRoot from './screens/ContactsRoot';

export type ContactSettingsStackParamList = {
  Root: undefined;
};

export enum ContactSettingsScreens {
  ROOT = 'Root',
}

const ContactSettings = createStackNavigator<ContactSettingsStackParamList>();

const ContactSettingsStack = () => {
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
          headerTitle: () => <HeaderTitle>Contacts</HeaderTitle>,
        }}
      />
    </ContactSettings.Navigator>
  );
};

export default ContactSettingsStack;
