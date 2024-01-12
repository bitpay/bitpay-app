import React, {useCallback, useContext, useMemo, useState} from 'react';
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
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import haptic from '../../../components/haptic-feedback/haptic';
import {ContactTitle, ContactTitleContainer} from '../screens/send/SendTo';
import ContactsSvg from '../../../../assets/img/tab-icons/contacts.svg';
import {useAppSelector} from '../../../utils/hooks';
import {FlatList, View} from 'react-native';
import {
  RecipientList,
  RecipientRowContainer,
  SendToOptionsContext,
} from '../screens/SendToOptions';
import {Recipient} from '../../../store/wallet/wallet.models';
import ContactRow from '../../../components/list/ContactRow';

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
  const route = useRoute<RouteProp<WalletGroupParamList, 'SendToOptions'>>();
  const {wallet, context} = route.params;
  const {
    recipientList,
    setRecipientListContext,
    setRecipientAmountContext,
    goToConfirmView,
    goToSelectInputsView,
  } = useContext(SendToOptionsContext);
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

  const renderItem = useCallback(
    ({item, index}) => {
      return (
        <RecipientList
          recipient={item}
          wallet={wallet}
          deleteRecipient={() => setRecipientListContext(item, index, true)}
          setAmount={() => setRecipientAmountContext(item, index, true)}
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
              renderItem={({item, index}: {item: Recipient; index: number}) =>
                renderItem({item, index})
              }
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
      {context !== 'selectInputs' ? (
        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            onPress={() => {
              haptic('impactLight');
              goToConfirmView();
            }}
            disabled={!recipientList[0]}>
            {t('Continue')}
          </Button>
        </CtaContainer>
      ) : null}
    </>
  );
};

export default SendToContact;
