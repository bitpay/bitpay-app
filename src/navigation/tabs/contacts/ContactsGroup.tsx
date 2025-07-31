import React from 'react';
import {useTranslation} from 'react-i18next';
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import ContactsRoot from './screens/ContactsRoot';
import ContactsDetails from './screens/ContactsDetails';
import ContactsAdd from './screens/ContactsAdd';
import {ContactRowProps} from '../../../components/list/ContactRow';
import {Root} from '../../../Root';
import {useStackScreenOptions} from '../../utils/headerHelpers';

interface ContactsProps {
  Contacts: typeof Root;
  theme: Theme;
}

export type ContactsGroupParamList = {
  ContactsRoot: undefined;
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
  ROOT = 'ContactsRoot',
  DETAILS = 'ContactsDetails',
  ADD = 'ContactsAdd',
}

const ContactsGroup: React.FC<ContactsProps> = ({Contacts, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <Contacts.Group screenOptions={commonOptions}>
      <Contacts.Screen name={ContactsScreens.ROOT} component={ContactsRoot} />
      <Contacts.Screen
        name={ContactsScreens.DETAILS}
        component={ContactsDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Details')}</HeaderTitle>,
        }}
      />
      <Contacts.Screen name={ContactsScreens.ADD} component={ContactsAdd} />
    </Contacts.Group>
  );
};

export default ContactsGroup;
