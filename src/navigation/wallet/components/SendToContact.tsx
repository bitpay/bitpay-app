import React, {useCallback, useContext, useState} from 'react';
import {
  CtaContainer as _CtaContainer,
  Hr,
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import styled, {useTheme} from 'styled-components/native';
import {H5, SubText} from '../../../components/styled/Text';
import {NeutralSlate} from '../../../styles/colors';
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
import {useAppSelector} from '../../../utils/hooks';
import {FlatList, View} from 'react-native';
import {
  RecipientList,
  RecipientRowContainer,
  SendToOptionsContext,
} from '../screens/SendToOptions';

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
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();
  const {wallet, context} = route.params;
  const {
    recipientList,
    setRecipientListContext,
    setRecipientAmountContext,
    goToConfirmView,
  } = useContext(SendToOptionsContext);
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

  const renderItem = useCallback(
    ({item}) => {
      return (
        <RecipientList
          recipient={item}
          wallet={wallet}
          deleteRecipient={() => setRecipientListContext(item, true)}
          setAmount={() => setRecipientAmountContext(item, true)}
          context={context}
        />
      );
    },
    [wallet, setRecipientListContext, setRecipientAmountContext],
  );

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
        <View style={{marginTop: 10}}>
          <H5>
            {recipientList?.length > 1 ? t('Recipients') : t('Recipient')}
          </H5>
          <Hr />
          {recipientList && recipientList.length ? (
            <FlatList
              data={recipientList}
              keyExtractor={(_item, index) => index.toString()}
              renderItem={renderItem}
            />
          ) : (
            <>
              <RecipientRowContainer>
                <SubText>
                  {t(
                    'To get started, you’ll need to enter a valid address or select an existing contact or wallet.',
                  )}
                </SubText>
              </RecipientRowContainer>
              <Hr />
            </>
          )}
        </View>
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
                <SendContactRow key={index}>
                  <SettingsContactRow
                    contact={item}
                    onPress={() => {
                      haptic('impactLight');
                      if (
                        !recipientList.some(r => r.address === item.address)
                      ) {
                        context === 'selectInputs'
                          ? setRecipientListContext({
                              ...item,
                              type: 'contact',
                            })
                          : setRecipientAmountContext({
                              ...item,
                              type: 'contact',
                            });
                      }
                    }}
                  />
                </SendContactRow>
              );
            })}
          </>
        ) : null}
      </ScrollViewContainer>
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => {
            haptic('impactLight');
            if (context === 'selectInputs') {
              navigation.navigate('Wallet', {
                screen: 'SelectInputs',
                params: {
                  recipient: {...recipientList[0]!},
                  wallet,
                },
              });
            } else {
              goToConfirmView();
            }
          }}
          disabled={!recipientList[0]}>
          {t('Continue')}
        </Button>
      </CtaContainer>
    </>
  );
};

export default SendToContact;
