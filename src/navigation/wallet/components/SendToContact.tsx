import React, {useContext, useMemo, useState} from 'react';
import {
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import styled, {useTheme} from 'styled-components/native';
import {NeutralSlate} from '../../../styles/colors';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import haptic from '../../../components/haptic-feedback/haptic';
import {ContactTitle, ContactTitleContainer} from '../screens/send/SendTo';
import ContactsSvg from '../../../../assets/img/tab-icons/contacts.svg';
import {useAppSelector} from '../../../utils/hooks';
import {View} from 'react-native';
import {SendToOptionsContext} from '../screens/SendToOptions';
import ContactRow from '../../../components/list/ContactRow';

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const SendToContactContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const SendToContact = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const route = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();
  const {wallet, context} = route.params;
  const {setRecipientAmountContext, goToSelectInputsView} =
    useContext(SendToOptionsContext);
  const {currencyAbbreviation, network} = wallet;

  const contacts = useMemo(() => {
    return allContacts.filter(
      contact =>
        contact.coin === currencyAbbreviation.toLowerCase() &&
        contact.network === network &&
        (contact.name.toLowerCase().includes(searchInput.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchInput.toLowerCase())),
    );
  }, [allContacts, searchInput, network, currencyAbbreviation]);

  return (
    <>
      <SendToContactContainer>
        <SearchContainer style={{height: 54}}>
          <SearchInput
            placeholder={t('Search contact')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={(text: string) => {
              setSearchInput(text);
            }}
          />
        </SearchContainer>
      </SendToContactContainer>
      <ScrollViewContainer>
        {contacts.length > 0 ? (
          <>
            <ContactTitleContainer>
              {ContactsSvg({})}
              <ContactTitle>{'Contacts'}</ContactTitle>
            </ContactTitleContainer>
            {contacts.map((item, index) => {
              return (
                <View key={index}>
                  <ContactRow
                    contact={item}
                    onPress={() => {
                      haptic('impactLight');
                      context === 'selectInputs'
                        ? goToSelectInputsView({...item, type: 'contact'})
                        : setRecipientAmountContext({
                            ...item,
                            type: 'contact',
                          });
                    }}
                  />
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollViewContainer>
    </>
  );
};

export default SendToContact;
