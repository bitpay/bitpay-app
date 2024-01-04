import React, {useState, useCallback, useEffect, useLayoutEffect} from 'react';
import {useTranslation} from 'react-i18next';
import debounce from 'lodash.debounce';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled, {useTheme} from 'styled-components/native';
import {TouchableOpacity, FlatList, View} from 'react-native';
import {useSelector} from 'react-redux';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation} from '@react-navigation/core';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import AddressBookIcon from '../../../../../assets/img/tab-icons/contacts.svg';
import AddContactIcon from '../../../../../assets/img/addcontact-icon.svg';
import AddContactIconWhite from '../../../../../assets/img/addcontact-icon-white.svg';
import Button from '../../../../components/button/Button';
import {
  ActiveOpacity,
  HEIGHT,
  WIDTH,
} from '../../../../components/styled/Containers';
import {BaseText, H4, HeaderTitle} from '../../../../components/styled/Text';
import {SlateDark, White, LightBlack, Cloud} from '../../../../styles/colors';
import BoxInput from '../../../../components/form/BoxInput';
import {RootState} from '../../../../store';
import ContactRow, {
  ContactRowProps,
} from '../../../../components/list/ContactRow';
import {ContactsScreens, ContactsGroupParamList} from '../ContactsGroup';

const ContactsContainer = styled.SafeAreaView`
  flex: 1;
`;

const NoContacts = styled.View`
  padding: 0 20px;
  height: 100%;
  display: flex;
  justify-content: center;
`;

const NoContactsIcon = styled.View`
  display: flex;
  align-items: center;
`;

const NoContactsTitle = styled(BaseText)`
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 20px;
`;

const ButtonContainer = styled.View`
  margin-top: 40px;
`;

const NoContactsSubTitle = styled(BaseText)`
  text-align: center;
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Title = styled(BaseText)`
  font-size: 14px;
  font-weight: bold;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 8px;
`;

const ContentTitle = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  padding-left: 7px;
`;

const ContentIcon = styled.View`
  padding-right: 10px;
`;

const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px 15px;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const horizontalPadding = 20;
const SearchBox = styled(BoxInput)`
  width: ${WIDTH - horizontalPadding * 2}px;
  font-size: 16px;
  position: relative;
`;

const SearchContainer = styled.View`
  padding: 0 ${horizontalPadding}px;
  margin: 20px 0;
`;

const SearchResults = styled.View`
  margin: 0 0 50px 0;
`;

const NoResultsContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: ${HEIGHT - 300}px;
  padding-top: 20px;
`;

const NoResultsHeader = styled(H4)`
  font-size: 17px;
`;

const Hr = styled.View`
  align-self: center;
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Cloud)};
  border-bottom-width: 1px;
  margin: 0 ${horizontalPadding}px;
  width: ${WIDTH - horizontalPadding * 2}px;
`;

interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
`;

const ContactsRoot = ({
  route,
}: NativeStackScreenProps<ContactsGroupParamList, ContactsScreens.ROOT>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const contacts = useSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  const {control} = useForm();
  const [searchResults, setSearchResults] = useState([] as ContactRowProps[]);
  const [searchVal, setSearchVal] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return contacts.length ? (
          <HeaderTitle>{t('My Contacts')}</HeaderTitle>
        ) : null;
      },
    });
  }, [navigation, contacts, t]);
  useEffect(() => {
    // Sort list
    contacts.sort((x, y) => {
      let a = x.name.toUpperCase(),
        b = y.name.toUpperCase();
      return a === b ? 0 : a > b ? 1 : -1;
    });
  }, [contacts]);

  const contactList = contacts as Array<ContactRowProps>;

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const results = contactList.filter(contact =>
      contact.name.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(results);
  }, 300);

  const keyExtractor = (item: ContactRowProps, index: number) => {
    return item.address + item.coin + item.network + index;
  };

  const renderItem = useCallback(
    ({item}) => (
      <View style={{paddingHorizontal: 20}}>
        <ContactRow
          contact={item}
          onPress={() => {
            navigation.navigate('ContactsDetails', {contact: item});
          }}
        />
      </View>
    ),
    [navigation],
  );

  const goToCreateContact = () => {
    navigation.navigate('ContactsAdd');
  };

  return (
    <ContactsContainer style={{paddingTop: insets.top}}>
      {contactList.length ? (
        <>
          <SearchContainer>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({field: {onChange, onBlur, value}}) => (
                <SearchBox
                  placeholder={t('Search Contacts')}
                  onBlur={onBlur}
                  onChangeText={(text: string) => {
                    onChange(text);
                    updateSearchResults(text);
                  }}
                  value={value}
                  type={t('search')}
                />
              )}
              name="search"
            />
          </SearchContainer>
          <SectionHeaderContainer justifyContent={'space-between'}>
            <ContentTitle>
              <AddressBookIcon />
              <Title>{t('Contacts')}</Title>
            </ContentTitle>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={goToCreateContact}>
              <ContentIcon>
                {theme.dark ? <AddContactIconWhite /> : <AddContactIcon />}
              </ContentIcon>
            </TouchableOpacity>
          </SectionHeaderContainer>
          <Hr />
          <HideableView show={!!searchVal}>
            {searchResults.length ? (
              <SearchResults>
                <FlatList
                  contentContainerStyle={{paddingBottom: 250, marginTop: 5}}
                  data={searchResults}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                />
              </SearchResults>
            ) : (
              <NoResultsContainer>
                <NoResultsHeader>{t('No Results')}</NoResultsHeader>
              </NoResultsContainer>
            )}
          </HideableView>
          <HideableView show={!searchVal}>
            <SearchResults>
              <FlatList
                contentContainerStyle={{paddingBottom: 250, marginTop: 5}}
                data={contactList}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
              />
            </SearchResults>
          </HideableView>
        </>
      ) : (
        <NoContacts>
          <NoContactsIcon>
            <AddressBookIcon width={60} height={100} />
          </NoContactsIcon>
          <NoContactsTitle>{t('No contacts yet')}</NoContactsTitle>
          <NoContactsSubTitle>
            {t('Get started by adding your first one.')}
          </NoContactsSubTitle>
          <ButtonContainer>
            <Button onPress={goToCreateContact} children="New Contact" />
          </ButtonContainer>
        </NoContacts>
      )}
    </ContactsContainer>
  );
};

export default ContactsRoot;
