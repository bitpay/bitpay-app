import React, {useState, useCallback, useLayoutEffect} from 'react';
import {useTranslation} from 'react-i18next';
import debounce from 'lodash.debounce';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../contexts';
import {FlatList, SafeAreaView, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
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

const horizontalPadding = 20;

const styles = StyleSheet.create({
  contactsContainer: {
    flex: 1,
  },
  noContacts: {
    paddingHorizontal: 20,
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  noContactsIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  noContactsTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 40,
  },
  noContactsSubTitle: {
    textAlign: 'center',
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contentTitle: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: 7,
  },
  contentIcon: {
    paddingRight: 10,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    marginHorizontal: 15,
  },
  searchBox: {
    width: WIDTH - horizontalPadding * 2,
    fontSize: 16,
    position: 'relative',
  },
  searchContainer: {
    paddingHorizontal: horizontalPadding,
    marginVertical: 20,
  },
  searchResults: {
    marginBottom: 50,
  },
  noResultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: HEIGHT - 300,
    paddingTop: 20,
  },
  noResultsHeader: {
    fontSize: 17,
  },
  hr: {
    alignSelf: 'center',
    borderBottomWidth: 1,
    marginHorizontal: horizontalPadding,
    width: WIDTH - horizontalPadding * 2,
  },
});

const NoContactsTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.noContactsTitle, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const NoContactsSubTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.noContactsSubTitle,
        {color: theme.dark ? White : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

const Title: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.title, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const SearchBox: React.FC<React.ComponentProps<typeof BoxInput>> = ({
  style,
  ...rest
}) => <BoxInput style={[styles.searchBox, style]} {...rest} />;

const NoResultsHeader: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <H4 style={styles.noResultsHeader}>{children}</H4>;

const Hr: React.FC = () => {
  const theme = useTheme();
  return (
    <View
      style={[styles.hr, {borderBottomColor: theme.dark ? LightBlack : Cloud}]}
    />
  );
};

interface HideableViewProps {
  show: boolean;
  children?: React.ReactNode;
}

const HideableView: React.FC<HideableViewProps> = ({show, children}) => (
  <View style={show ? {display: 'flex'} : {display: 'none'}}>{children}</View>
);

const SectionHeaderContainer: React.FC<{
  justifyContent?: string;
  children?: React.ReactNode;
}> = ({justifyContent, children}) => (
  <View
    style={[
      styles.sectionHeaderContainer,
      {justifyContent: (justifyContent as any) || 'flex-start'},
    ]}>
    {children}
  </View>
);

const ContactsRoot = ({}: NativeStackScreenProps<
  ContactsGroupParamList,
  ContactsScreens.ROOT
>) => {
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
    <SafeAreaView style={[styles.contactsContainer, {paddingTop: insets.top}]}>
      {contactList.length ? (
        <>
          <View style={styles.searchContainer}>
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
          </View>
          <SectionHeaderContainer justifyContent={'space-between'}>
            <View style={styles.contentTitle}>
              <AddressBookIcon />
              <Title>{t('Contacts')}</Title>
            </View>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              testID="contacts-add-contact-button"
              accessibilityLabel="Add contact"
              onPress={goToCreateContact}>
              <View style={styles.contentIcon}>
                {theme.dark ? <AddContactIconWhite /> : <AddContactIcon />}
              </View>
            </TouchableOpacity>
          </SectionHeaderContainer>
          <Hr />
          <HideableView show={!!searchVal}>
            {searchResults.length ? (
              <View style={styles.searchResults}>
                <FlatList
                  contentContainerStyle={{paddingBottom: 250, marginTop: 5}}
                  data={searchResults}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                />
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <NoResultsHeader>{t('No Results')}</NoResultsHeader>
              </View>
            )}
          </HideableView>
          <HideableView show={!searchVal}>
            <View style={styles.searchResults}>
              <FlatList
                contentContainerStyle={{paddingBottom: 250, marginTop: 5}}
                data={contactList}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
              />
            </View>
          </HideableView>
        </>
      ) : (
        <View style={styles.noContacts}>
          <View style={styles.noContactsIcon}>
            <AddressBookIcon width={60} height={100} />
          </View>
          <NoContactsTitle>{t('No contacts yet')}</NoContactsTitle>
          <NoContactsSubTitle>
            {t('Get started by adding your first one.')}
          </NoContactsSubTitle>
          <View style={styles.buttonContainer}>
            <Button
              testID="contacts-new-contact-button"
              accessibilityLabel="New contact"
              onPress={goToCreateContact}
              children="New Contact"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ContactsRoot;
