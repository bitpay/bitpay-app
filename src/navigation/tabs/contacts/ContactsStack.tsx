import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import React from 'react';
import {HomeScreens} from '../home/HomeStack';
import ContactsRoot from './ContactsRoot';

export type ContactsStackParamList = {
  Root: undefined;
};

export enum ContactsScreens {
  Root = 'Root',
}

const Contacts = createStackNavigator<ContactsStackParamList>();

const ContactsStack = () => {
  return (
    <Contacts.Navigator
      initialRouteName={HomeScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Contacts.Screen
        name={ContactsScreens.Root}
        component={ContactsRoot}
        options={{
          headerShown: false,
        }}
      />
    </Contacts.Navigator>
  );
};

export default ContactsStack;
