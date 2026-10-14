import React from 'react';
import {H6, Link} from '../../../../components/styled/Text';
import {RootState} from '../../../../store';
import Icons from '../../../wallet/components/WalletIcons';
import {useAppSelector} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActiveOpacity,
  Hr,
  ScreenGutter,
  Setting,
} from '../../../../components/styled/Containers';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import ContactRow from '../../../../components/list/ContactRow';
import {SettingsDetailsParamList} from '../SettingsDetails';

const styles = StyleSheet.create({
  seeAllLink: {
    fontWeight: '500',
    fontSize: 18,
  },
  plusIconContainer: {
    marginRight: 15,
  },
  contactsContainer: {
    margin: parseInt(ScreenGutter, 10),
  },
});

const SeeAllLink = ({style, ...rest}: React.ComponentProps<typeof Link>) => (
  <Link style={[styles.seeAllLink, style]} {...rest} />
);

const PlusIconContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.plusIconContainer, style]} {...rest} />
);

const ContactsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.contactsContainer, style]} {...rest} />
);

type Props = NativeStackScreenProps<SettingsDetailsParamList, 'Contacts'>;

const Contacts: React.FC<Props> = ({navigation}) => {
  const {t} = useTranslation();
  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);

  return (
    <SettingsComponent>
      <ContactsContainer>
        {contacts.length
          ? contacts.slice(0, 6).map((item, index) => (
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
      </ContactsContainer>

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

      {contacts.length > 6 ? (
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
