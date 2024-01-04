import React from 'react';
import {H6, Link} from '../../../../components/styled/Text';
import {RootState} from '../../../../store';
import {useAppSelector} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';
import {useNavigation} from '@react-navigation/native';
import {
  ActiveOpacity,
  Hr,
  Setting,
} from '../../../../components/styled/Containers';
import {View} from 'react-native';
import styled from 'styled-components/native';
import Icons from '../../../wallet/components/WalletIcons';
import {useTranslation} from 'react-i18next';
import ContactRow from '../../../../components/list/ContactRow';

const SeeAllLink = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;

const PlusIconContainer = styled.View`
  margin-right: 15px;
`;

const Contacts = () => {
  const {t} = useTranslation();
  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  return (
    <SettingsComponent>
      {contacts.length
        ? contacts.slice(0, 2).map((item, index) => (
            <View key={index}>
              <ContactRow
                contact={item}
                onPress={() => {
                  navigation.navigate('ContactsDetails', {contact: item});
                }}
              />
              <Hr />
            </View>
          ))
        : null}

      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() => {
          navigation.navigate('ContactsAdd');
        }}>
        <PlusIconContainer>
          <Icons.Add />
        </PlusIconContainer>

        <H6 medium={true}>{t('Add Contact')}</H6>
      </Setting>

      {contacts.length > 2 ? (
        <Setting
          style={{justifyContent: 'center'}}
          onPress={() => navigation.navigate('ContactsRoot')}
          activeOpacity={ActiveOpacity}>
          <SeeAllLink>
            {t('View All Contacts', {contactsLength: contacts.length})}
          </SeeAllLink>
        </Setting>
      ) : null}
    </SettingsComponent>
  );
};

export default Contacts;
