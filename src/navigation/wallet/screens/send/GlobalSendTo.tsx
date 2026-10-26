import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  ScreenGutter,
  SearchContainer,
  SearchInput,
} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import ContactsSvg from '../../../../../assets/img/tab-icons/contacts.svg';
import {NeutralSlate} from '../../../../styles/colors';
import haptic from '../../../../components/haptic-feedback/haptic';
import ContactRow, {
  ContactRowProps,
} from '../../../../components/list/ContactRow';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {incomingData} from '../../../../store/scan/scan.effects';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../components/ErrorMessages';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {getErrorString} from '../../../../utils/helper-methods';
import {
  ContactTitle,
  ContactTitleContainer,
  isEmailAddress,
  SendToEmailRow,
} from './SendTo';
import {
  getContactSendRecipient,
  isSendableData,
  useDebouncedSendToValidation,
} from './sendTo.utils';
import {WalletGroupParamList} from '../../WalletGroup';

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  scrollContent: {paddingHorizontal: parseInt(ScreenGutter, 10)},
  scrollView: {flex: 1, marginTop: 20},
  contactContainer: {marginTop: 20},
});

const GlobalSendTo = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {params} = useRoute<RouteProp<WalletGroupParamList, 'GlobalSendTo'>>();
  const selectedAccountAddress = params?.selectedAccountAddress;
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const allContacts = useAppSelector(({CONTACT}) => CONTACT.list);
  const [searchInput, setSearchInput] = useState('');
  const [searchIsEmailAddress, setSearchIsEmailAddress] = useState(false);

  const contacts = useMemo(() => {
    const normalizedSearch = searchInput.toLowerCase();
    return allContacts.filter(
      (contact: ContactRowProps) =>
        contact.name.toLowerCase().includes(normalizedSearch) ||
        contact.email?.toLowerCase().includes(normalizedSearch),
    );
  }, [allContacts, searchInput]);

  const goToRecipient = async (data: string) => {
    try {
      await dispatch(incomingData(data, {selectedAccountAddress}));
    } catch (err) {
      const errMsg = getErrorString(err);
      logger.error(`Global Send To: ${errMsg}`);
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({title: t('Error'), errMsg}),
        ),
      );
    }
  };

  const goToRecipientRef = useRef(goToRecipient);
  goToRecipientRef.current = goToRecipient;

  const debouncedValidateSearchInput = useDebouncedSendToValidation(text => {
    const data = text.trim();
    if (isSendableData(data)) {
      goToRecipientRef.current(data);
    }
  });

  const onSearchInputChange = useCallback(
    (text: string) => {
      setSearchInput(text);

      if (user && isEmailAddress(text.trim())) {
        debouncedValidateSearchInput.cancel();
        setSearchIsEmailAddress(true);
        return;
      }

      setSearchIsEmailAddress(false);
      debouncedValidateSearchInput(text);
    },
    [debouncedValidateSearchInput, user],
  );

  const onEmailPress = useCallback(() => {
    navigation.navigate('GlobalSelect', {
      context: 'contact',
      recipient: {
        email: searchInput.trim().toLowerCase(),
        type: 'address',
        network,
      },
      selectedAccountAddress,
    });
  }, [navigation, network, searchInput, selectedAccountAddress]);

  const onContactSelect = useCallback(
    (contact: ContactRowProps) => {
      navigation.navigate('GlobalSelect', {
        context: 'contact',
        recipient: getContactSendRecipient(contact),
        selectedAccountAddress,
      });
    },
    [navigation, selectedAccountAddress],
  );

  const onOpenScanner = useCallback(() => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Open Scanner', {
        context: 'GlobalSendTo',
      }),
    );
    navigation.navigate('ScanRoot', {
      onScanComplete: data => goToRecipientRef.current(data),
    });
  }, [dispatch, navigation]);

  useEffect(() => {
    let clearSearchTimeout: ReturnType<typeof setTimeout> | undefined;
    const cancelClearSearch = () => clearTimeout(clearSearchTimeout);
    const unsubscribeBlur = navigation.addListener('blur', () => {
      debouncedValidateSearchInput.cancel();
      cancelClearSearch();
      clearSearchTimeout = setTimeout(() => {
        setSearchInput('');
        setSearchIsEmailAddress(false);
      }, 300);
    });
    const unsubscribeFocus = navigation.addListener('focus', cancelClearSearch);

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
      cancelClearSearch();
    };
  }, [debouncedValidateSearchInput, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps={'handled'}>
        <SearchContainer>
          <SearchInput
            testID="global-send-to-address-input"
            accessibilityLabel={t('Recipient address')}
            placeholder={t('Search contact or enter address')}
            placeholderTextColor={theme.dark ? NeutralSlate : '#6F7782'}
            value={searchInput}
            onChangeText={onSearchInputChange}
          />
          <TouchableOpacity
            testID="global-send-to-scan-qr-button"
            accessibilityLabel={t('Scan QR code')}
            activeOpacity={0.75}
            onPress={onOpenScanner}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>

        {searchIsEmailAddress ? (
          <SendToEmailRow
            email={searchInput.trim().toLowerCase()}
            onPress={onEmailPress}
          />
        ) : null}

        {contacts.length > 0 && !searchIsEmailAddress ? (
          <View style={styles.contactContainer}>
            <ContactTitleContainer>
              <ContactsSvg />
              <ContactTitle>{t('Contacts')}</ContactTitle>
            </ContactTitleContainer>

            {contacts.map((contact: ContactRowProps) => (
              <ContactRow
                key={`${contact.network}:${contact.chain}:${contact.address}:${
                  contact.destinationTag ?? contact.tag ?? ''
                }:${contact.name}:${contact.email ?? ''}`}
                contact={contact}
                onPress={() => onContactSelect(contact)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GlobalSendTo;
