import React, {useState} from 'react';
import {
  CtaContainer as _CtaContainer,
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import styled, {useTheme} from 'styled-components/native';
import {Paragraph} from '../../../components/styled/Text';
import {NeutralSlate} from '../../../styles/colors';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ContactTitle,
  ContactTitleContainer,
  SendContactRow,
} from '../screens/send/SendTo';
import ContactsSvg from '../../../../assets/img/tab-icons/contacts.svg';
import SettingsContactRow from '../../../components/list/SettingsContactRow';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {ContactRowProps} from '../../../components/list/ContactRow';

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const SendToContactContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 16px;
`;

const SendToContact = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactRowProps>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();
  const {wallet} = route.params;
  const {
    currencyAbbreviation,
    credentials: {network},
  } = wallet;

  const contacts = allContacts.filter(
    contact =>
      contact.coin === currencyAbbreviation &&
      contact.network === network &&
      (contact.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchInput.toLowerCase())),
  );

  return (
    <>
      <SendToContactContainer>
        <Paragraph>
          {t(
            'To get started, you’ll need to enter a valid address or select an existing contact or wallet.',
          )}
        </Paragraph>
        <SearchContainer style={{marginTop: 25, height: 54}}>
          <SearchInput
            placeholder={t('Search contact')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={(text: string) => {
              setSearchInput(text);
            }}
          />
        </SearchContainer>

        <ScrollViewContainer>
          {contacts.length > 0 ? (
            <>
              <ContactTitleContainer>
                {ContactsSvg({})}
                <ContactTitle>{'Contacts'}</ContactTitle>
              </ContactTitleContainer>

              {contacts.map((item, index) => {
                return (
                  <SendContactRow key={index}>
                    <SettingsContactRow
                      contact={item}
                      onPress={() => {
                        haptic('impactLight');
                        try {
                          if (item) {
                            setSelectedContact(item);
                            setSearchInput(item.name);
                          }
                        } catch (err) {
                          console.log(err);
                        }
                      }}
                    />
                  </SendContactRow>
                );
              })}
            </>
          ) : null}
        </ScrollViewContainer>
      </SendToContactContainer>
      {contacts.length > 0 ? (
        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Wallet', {
                screen: 'SelectInputs',
                params: {
                  recipient: {...selectedContact!, type: 'contact'},
                  wallet,
                },
              });
            }}
            disabled={!selectedContact}>
            {t('Continue')}
          </Button>
        </CtaContainer>
      ) : null}
    </>
  );
};

export default SendToContact;
