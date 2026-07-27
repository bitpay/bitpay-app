import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BaseText,
  HeaderTitle,
  Paragraph,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {
  ActiveOpacity,
  ScreenGutter,
  SearchContainer,
  SearchInput,
} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import SendLightSvg from '../../../../../assets/img/send-icon-light.svg';
import ContactsSvg from '../../../../../assets/img/tab-icons/contacts.svg';
import {
  LightBlack,
  LightBlue,
  Midnight,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {Effect, RootState} from '../../../../store';
import {getErrorString, sleep} from '../../../../utils/helper-methods';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateCoinAddress,
  ValidateURI,
} from '../../../../store/wallet/utils/validations';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../../components/haptic-feedback/haptic';
import {GetPayProUrl} from '../../../../store/wallet/utils/decode-uri';
import KeyWalletsRow from '../../../../components/list/KeyWalletsRow';
import type {WalletRowProps} from '../../../../components/list/WalletRow';
import {
  GetPayProOptions,
  GetInvoiceCurrency,
  PayProPaymentOption,
} from '../../../../store/wallet/effects/paypro/paypro';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {
  BchLegacyAddressInfo,
  CustomErrorMessage,
  Mismatch,
} from '../../components/ErrorMessages';
import {
  createWalletAddress,
  TranslateToBchCashAddress,
} from '../../../../store/wallet/effects/address/address';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {
  IsUtxoChain,
  IsOtherChain,
  IsEVMChain,
  IsSVMChain,
} from '../../../../store/wallet/utils/currency';
import {goToAmount, incomingData} from '../../../../store/scan/scan.effects';
import {useTranslation} from 'react-i18next';
import Settings from '../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../components/OptionsSheet';
import Icons from '../../components/WalletIcons';
import ContactRow, {
  ContactRowProps,
} from '../../../../components/list/ContactRow';
import {ReceivingAddress} from '../../../../store/bitpay-id/bitpay-id.models';
import {BitPayIdEffects} from '../../../../store/bitpay-id';
import {getCurrencyCodeFromCoinAndChain} from '../../../bitpay-id/utils/bitpay-id-utils';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {URL} from '../../../../constants';
import {keyBackupRequired} from '../../../../navigation/tabs/home/components/Crypto';
import {useOngoingProcess} from '../../../../contexts';
import {logManager} from '../../../../managers/LogManager';
import {
  BuildKeyAccountRow,
  useDebouncedSendToValidation,
  useSendToKeyAccounts,
} from './sendTo.utils';
import {logReactProfiler} from '../../../../utils/reactPerformanceProfiler';
import PerformanceProfiler from '../../../../components/performance/PerformanceProfiler';
import {findWalletById} from '../../../../store/wallet/utils/wallet';

export {BuildKeyAccountRow};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  scrollContent: {paddingHorizontal: parseInt(ScreenGutter, 10)},
  scrollView: {flex: 1, marginTop: 20},
  contactContainer: {marginTop: 20},
  contactTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  contactTitle: {marginLeft: 10},
  emailContainer: {flexDirection: 'row', marginTop: 10},
  emailIconContainer: {
    alignItems: 'center',
    borderRadius: 50,
    justifyContent: 'center',
    marginRight: 13,
    height: 50,
    width: 50,
  },
  emailTextContainer: {justifyContent: 'center'},
  emailText: {fontWeight: '600'},
  infoSheetMessage: {paddingVertical: 20},
});

export const ContactTitleContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...props}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.contactTitleContainer,
        {borderBottomColor: theme.dark ? LightBlack : LightBlue},
        style,
      ]}
      {...props}
    />
  );
};

export const ContactTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...props
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.contactTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...props}
    />
  );
};

const isEmailAddress = (text: string) => {
  if (!text.includes('@')) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
};

const MemoizedKeyWalletsRow = React.memo(KeyWalletsRow);
const MemoizedOptionsSheet = React.memo(OptionsSheet);

type SendToContactResultProps = {
  contact: ContactRowProps;
  onSelect: (contact: ContactRowProps) => void;
};

const SendToContactResult = React.memo(
  ({contact, onSelect}: SendToContactResultProps) => {
    const onPress = useCallback(() => onSelect(contact), [contact, onSelect]);
    return <ContactRow contact={contact} onPress={onPress} />;
  },
);

const SendToContent = ({wallet}: {wallet: Wallet}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();

  const keys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency.isoCode,
  );
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [walletSearchInput, setWalletSearchInput] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [searchIsEmailAddress, setSearchIsEmailAddress] = useState(false);
  const emailAddressSearchPromiseRef = useRef<Promise<ReceivingAddress[]>>(
    Promise.resolve([]),
  );

  const {currencyAbbreviation, id, chain, network} = wallet;

  const isUtxo = IsUtxoChain(chain);
  const isXrp = IsOtherChain(chain);

  const openWalletOptions = useCallback(() => {
    setShowWalletOptions(true);
  }, []);
  const closeWalletOptions = useCallback(() => {
    setShowWalletOptions(false);
  }, []);

  const assetOptions = useMemo<Array<Option>>(() => {
    const selectInputOption: Option = {
      img: <Icons.SelectInputs />,
      title: t('Select Inputs for this Transaction'),
      description: t("Choose which inputs you'd like to use to send crypto."),
      onPress: () => {
        navigation.navigate('SendToOptions', {
          title: t('Select Inputs'),
          wallet,
          context: 'selectInputs',
        });
      },
    };

    const multisendOption: Option = {
      img: <Icons.Multisend />,
      title: t('Transfer to Multiple Recipients'),
      description: t('Send crypto to multiple contacts or addresses.'),
      onPress: () => {
        navigation.navigate('SendToOptions', {
          title: t('Multiple Recipients'),
          wallet,
          context: 'multisend',
        });
      },
    };

    const bridgeOptions: Array<{chain: string; option: Option}> = [
      {
        chain: 'matic',
        option: {
          img: <Icons.BridgeToPolygon />,
          title: t('Bridge to Polygon'),
          description: t('Transfer your assets to Polygon network'),
          onPress: () => {
            Linking.openURL(URL.POLYGON_BRIDGE);
          },
        },
      },
      {
        chain: 'arb',
        option: {
          img: <Icons.BridgeToPolygon />,
          title: t('Bridge to Arbitrum'),
          description: t('Transfer your assets to Arbitrum network'),
          onPress: () => {
            Linking.openURL(URL.ARBITRUM_BRIDGE);
          },
        },
      },
      {
        chain: 'base',
        option: {
          img: <Icons.BridgeToPolygon />,
          title: t('Bridge to Base'),
          description: t('Transfer your assets to Base network'),
          onPress: () => {
            Linking.openURL(URL.BASE_BRIDGE);
          },
        },
      },
      {
        chain: 'op',
        option: {
          img: <Icons.BridgeToPolygon />,
          title: t('Bridge to Optimism'),
          description: t('Transfer your assets to Optimism network'),
          onPress: () => {
            Linking.openURL(URL.OPTIMISM_BRIDGE);
          },
        },
      },
    ];

    if (isUtxo) {
      return [multisendOption, selectInputOption];
    }

    return bridgeOptions
      .filter(({chain: bridgeChain}) => {
        return chain === bridgeChain || chain === 'eth';
      })
      .map(({option}) => option);
  }, [chain, isUtxo, navigation, t, wallet]);

  const headerTitle = t('Send To');
  const hasAssetOptions = assetOptions.length > 0;
  const renderHeaderTitle = useCallback(
    () => <HeaderTitle>{headerTitle}</HeaderTitle>,
    [headerTitle],
  );
  const renderHeaderRight = useCallback(
    () => (hasAssetOptions ? <Settings onPress={openWalletOptions} /> : null),
    [hasAssetOptions, openWalletOptions],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: renderHeaderTitle,
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight, renderHeaderTitle]);

  const keyAccounts = useSendToKeyAccounts({
    keys,
    currentWalletId: id,
    currentCurrencyAbbreviation: currencyAbbreviation,
    currentChain: chain,
    currentNetwork: network,
    defaultAltCurrencyIsoCode,
    searchInput: walletSearchInput,
    rates,
    dispatch,
    logger,
  });

  const contacts = useMemo(() => {
    const normalizedSearch = searchInput.toLowerCase();
    const normalizedCurrencyAbbreviation = currencyAbbreviation.toLowerCase();
    const normalizedChain = chain.toLowerCase();
    const isEvm = IsEVMChain(chain);
    const isSvm = IsSVMChain(chain);

    const matchesContact = (contact: ContactRowProps) =>
      contact.network === network &&
      (contact.name.toLowerCase().includes(normalizedSearch) ||
        contact.email?.toLowerCase().includes(normalizedSearch));

    return allContacts.filter((contact: ContactRowProps) => {
      if (isUtxo || isXrp) {
        return (
          contact.coin === normalizedCurrencyAbbreviation &&
          contact.chain === normalizedChain &&
          matchesContact(contact)
        );
      }

      if (isEvm) {
        return IsEVMChain(contact.chain) && matchesContact(contact);
      }

      if (isSvm) {
        return IsSVMChain(contact.chain) && matchesContact(contact);
      }

      return false;
    });
  }, [
    allContacts,
    chain,
    currencyAbbreviation,
    isUtxo,
    isXrp,
    network,
    searchInput,
  ]);

  const onErrorMessageDismiss = useCallback(() => {
    setSearchInput('');
    setWalletSearchInput('');
  }, []);

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:|bchreg:)/, ''),
      );
      setSearchInput(cashAddr);
      setWalletSearchInput(cashAddr);
      validateAndNavigateToConfirm(cashAddr);
    } catch {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const checkCoinAndNetwork =
    (data: any, isPayPro?: boolean): Effect<boolean> =>
    dispatchEffect => {
      let isValid = false;
      if (isPayPro) {
        isValid =
          data?.chain?.toLowerCase() === chain.toLowerCase() &&
          data?.network.toLowerCase() === network.toLowerCase();
      } else {
        isValid = ValidateCoinAddress(data, chain, network);
      }

      if (currencyAbbreviation === 'bch' && isValid && !isPayPro) {
        const isLegacy = CheckIfLegacyBCH(data);
        if (isLegacy) {
          const appName = APP_NAME_UPPERCASE;

          dispatchEffect(
            showBottomNotificationModal(
              BchLegacyAddressInfo(appName, () => {
                // TODO: This doesn't seem to work
                BchLegacyAddressInfoDismiss(data);
                return false;
              }),
            ),
          );
        }
      }

      return isValid;
    };

  const validateText = async (text: string) => {
    const data = ValidateURI(text);
    if (data?.type === 'PayPro' || data?.type === 'InvoiceUri') {
      try {
        const invoiceUrl = GetPayProUrl(text);
        showOngoingProcess('FETCHING_PAYMENT_OPTIONS');

        const payProOptions = await dispatch(GetPayProOptions(invoiceUrl));
        await sleep(500);
        hideOngoingProcess();
        const invoiceCurrency = getCurrencyCodeFromCoinAndChain(
          GetInvoiceCurrency(currencyAbbreviation).toLowerCase(),
          chain,
        );
        const selected: PayProPaymentOption | undefined =
          payProOptions.paymentOptions.find(
            (option: PayProPaymentOption) =>
              invoiceCurrency === option.currency,
          );

        if (selected) {
          const isValid = dispatch(checkCoinAndNetwork(selected, true));
          if (isValid) {
            return Promise.resolve({isValid: true, invalidReason: undefined});
          } else {
            logger.warn('PayPro and wallet selected network/coin invalid');
            return Promise.resolve({
              isValid: false,
              invalidReason: 'invalidCurrency',
            });
          }
        } else {
          logger.warn('PayPro and wallet selected network/coin mismatch');
          return Promise.resolve({
            isValid: false,
            invalidReason: 'invalidCurrency',
          });
        }
      } catch (err) {
        const formattedErrMsg = BWCErrorMessage(err);
        await sleep(500);
        hideOngoingProcess();
        logger.warn(formattedErrMsg);
        return Promise.resolve({
          isValid: false,
          invalidReason: formattedErrMsg,
        });
      }
    } else if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        return Promise.resolve({isValid: true, invalidReason: undefined});
      } else {
        logger.warn(
          `Data type (${data?.type}) and wallet selected network/coin mismatch`,
        );
        return Promise.resolve({
          isValid: false,
          invalidReason: 'invalidCurrency',
        });
      }
    } else {
      logger.warn(`Data type (${data?.type}) invalid`);
      return Promise.resolve({isValid: false, invalidReason: undefined});
    }
  };

  const validateAndNavigateToConfirm = async (
    text: string,
    opts: {
      context?: string;
      name?: string;
      email?: string;
      destinationTag?: number;
      searching?: boolean;
    } = {},
  ) => {
    const {context, name, email, destinationTag} = opts;
    if (user && isEmailAddress(text.trim())) {
      setSearchIsEmailAddress(true);
      return;
    }
    setSearchIsEmailAddress(false);
    const res = await validateText(text);
    if (res?.isValid) {
      await dispatch(
        incomingData(text, {wallet, context, name, email, destinationTag}),
      );
    } else if (res?.invalidReason === 'invalidCurrency') {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    } else if (res?.invalidReason && typeof res.invalidReason === 'string') {
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Error'),
            errMsg: res.invalidReason,
            action: () => onErrorMessageDismiss,
          }),
        ),
      );
    }
  };

  const validateAndNavigateToConfirmRef = useRef(validateAndNavigateToConfirm);
  validateAndNavigateToConfirmRef.current = validateAndNavigateToConfirm;

  const debouncedValidateSearchInput = useDebouncedSendToValidation(text => {
    setWalletSearchInput(text);
    validateAndNavigateToConfirmRef.current(text);
  });

  const onSearchInputChange = useCallback(
    (text: string) => {
      setSearchInput(text);

      if (user && isEmailAddress(text.trim())) {
        debouncedValidateSearchInput.cancel();
        setWalletSearchInput(text);
        validateAndNavigateToConfirmRef.current(text);
        return;
      }

      setSearchIsEmailAddress(false);
      debouncedValidateSearchInput(text);
    },
    [debouncedValidateSearchInput, user],
  );

  const onSendToWallet = useCallback(
    async (selectedWallet: Wallet) => {
      try {
        const {
          credentials,
          currencyAbbreviation: currency,
          id: walletId,
          keyId,
          walletName,
          receiveAddress,
          chain: selectedWalletChain,
        } = selectedWallet;

        let address = receiveAddress;

        if (!address) {
          showOngoingProcess('GENERATING_ADDRESS');
          address = await dispatch<Promise<string>>(
            createWalletAddress({wallet: selectedWallet, newAddress: false}),
          );
          hideOngoingProcess();
        }

        const recipient = {
          type: 'wallet',
          name: walletName || credentials.walletName,
          walletId,
          keyId,
          address,
          currency,
          chain: selectedWalletChain,
        };

        dispatch(
          goToAmount({
            coin: wallet.currencyAbbreviation,
            chain: wallet.chain,
            recipient,
            wallet,
          }),
        );
      } catch (err: any) {
        logger.error(`Send To: ${getErrorString(err)}`);
        hideOngoingProcess();
      }
    },
    [dispatch, hideOngoingProcess, logger, showOngoingProcess, wallet],
  );

  const onKeyWalletPress = useCallback(
    (selectedWallet: Wallet | WalletRowProps) => {
      if (!('credentials' in selectedWallet)) {
        return;
      }

      const selectedKey = keys[selectedWallet.keyId];
      if (selectedKey.backupComplete) {
        onSendToWallet(selectedWallet);
        return;
      }

      logger.debug('Key selected. Needs backup.');
      dispatch(
        showBottomNotificationModal(
          keyBackupRequired(selectedKey, navigation, dispatch, 'send'),
        ),
      );
    },
    [dispatch, keys, logger, navigation, onSendToWallet],
  );

  const onContactSelect = useCallback(
    (item: ContactRowProps) => {
      try {
        validateAndNavigateToConfirmRef.current(item.address, {
          context: 'contact',
          name: item.name,
          destinationTag: item.tag || item.destinationTag,
        });
      } catch (err) {
        logger.error(`Send To [Contacts]: ${getErrorString(err)}`);
      }
    },
    [logger],
  );

  const onOpenScanner = useCallback(() => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Open Scanner', {
        context: 'SendTo',
      }),
    );
    navigation.navigate('ScanRoot', {
      onScanComplete: data => {
        try {
          if (data) {
            validateAndNavigateToConfirmRef.current(data);
          }
        } catch (err) {
          const e = err instanceof Error ? err.message : JSON.stringify(err);
          logManager.error('[OpenScanner SendTo] ', e);
        }
      },
    });
  }, [dispatch, navigation]);

  useEffect(() => {
    if (searchIsEmailAddress) {
      const email = searchInput.trim().toLowerCase();
      emailAddressSearchPromiseRef.current = dispatch(
        BitPayIdEffects.startFetchReceivingAddresses({
          email,
          currency: getCurrencyCodeFromCoinAndChain(
            currencyAbbreviation,
            wallet.chain,
          ),
        }),
      ).catch(_ => Promise.resolve([]));
    } else {
      emailAddressSearchPromiseRef.current = Promise.resolve([]);
    }
  }, [
    searchIsEmailAddress,
    searchInput,
    dispatch,
    currencyAbbreviation,
    wallet.chain,
  ]);

  useEffect(() => {
    let clearSearchTimeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = navigation.addListener('blur', () => {
      debouncedValidateSearchInput.cancel();
      setSearchIsEmailAddress(false);
      emailAddressSearchPromiseRef.current = Promise.resolve([]);
      clearSearchTimeout = setTimeout(() => {
        setSearchInput('');
        setWalletSearchInput('');
      }, 300);
    });

    return () => {
      unsubscribe();
      if (clearSearchTimeout) {
        clearTimeout(clearSearchTimeout);
      }
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
            testID="send-to-address-input"
            accessibilityLabel="Recipient address"
            placeholder={t('Search contact or enter address')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={onSearchInputChange}
          />
          <TouchableOpacity
            testID="send-to-scan-qr-button"
            accessibilityLabel="Send to scan qr button"
            activeOpacity={0.75}
            onPress={onOpenScanner}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>

        {searchIsEmailAddress ? (
          <TouchableOpacity
            testID="send-to-email-send-button"
            accessibilityLabel="Send to email send button"
            activeOpacity={ActiveOpacity}
            onPress={async () => {
              const email = searchInput.toLowerCase();
              const emailReceivingAddresses =
                await emailAddressSearchPromiseRef.current;
              const addressMatchingCurrency = emailReceivingAddresses.find(
                ({coin, chain: addressChain}) =>
                  currencyAbbreviation.toLowerCase() === coin.toLowerCase() &&
                  chain.toLowerCase() === addressChain.toLowerCase(),
              );
              addressMatchingCurrency
                ? validateAndNavigateToConfirmRef.current(
                    addressMatchingCurrency.address,
                    {email},
                  )
                : dispatch(
                    showBottomNotificationModal({
                      type: 'warning',
                      title: 'Unable to Send to Contact',
                      message: '',
                      message2: (
                        <View style={styles.infoSheetMessage}>
                          <Paragraph>
                            <Paragraph style={styles.emailText}>
                              {email}
                            </Paragraph>{' '}
                            is not yet able to receive crypto to their email.
                          </Paragraph>
                        </View>
                      ),
                      enableBackdropDismiss: true,
                      actions: [
                        {
                          text: 'OK',
                          action: async () => {
                            dispatch(dismissBottomNotificationModal());
                          },
                          primary: true,
                        },
                      ],
                    }),
                  );
            }}>
            <View style={styles.emailContainer}>
              <View
                style={[
                  styles.emailIconContainer,
                  {backgroundColor: theme.dark ? Midnight : '#EDF0FE'},
                ]}>
                <SendLightSvg />
              </View>
              <View style={styles.emailTextContainer}>
                <Paragraph>
                  Send to{' '}
                  <Paragraph style={styles.emailText}>
                    {searchInput.toLowerCase()}
                  </Paragraph>
                </Paragraph>
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        <PerformanceProfiler id="SendTo:contacts" onRender={logReactProfiler}>
          {contacts.length > 0 && !searchIsEmailAddress ? (
            <View style={styles.contactContainer}>
              <ContactTitleContainer>
                {ContactsSvg({})}
                <ContactTitle>{t('Contacts')}</ContactTitle>
              </ContactTitleContainer>

              {contacts.map((item: ContactRowProps) => (
                <SendToContactResult
                  key={`${item.network}:${item.chain}:${item.address}:${
                    item.destinationTag ?? item.tag ?? ''
                  }:${item.name}:${item.email ?? ''}`}
                  contact={item}
                  onSelect={onContactSelect}
                />
              ))}
            </View>
          ) : null}
        </PerformanceProfiler>

        <MemoizedOptionsSheet
          isVisible={showWalletOptions}
          closeModal={closeWalletOptions}
          options={assetOptions}
        />

        <PerformanceProfiler id="SendTo:wallets" onRender={logReactProfiler}>
          <View style={{marginTop: 10}}>
            <MemoizedKeyWalletsRow
              keyAccounts={keyAccounts}
              hideBalance={hideAllBalances}
              onPress={onKeyWalletPress}
            />
          </View>
        </PerformanceProfiler>
      </ScrollView>
    </SafeAreaView>
  );
};

const SendTo = () => {
  const {
    params: {keyId, walletId, copayerId},
  } = useRoute<RouteProp<WalletGroupParamList, 'SendTo'>>();
  const navigation = useNavigation();
  const wallet = useAppSelector(({WALLET}) =>
    findWalletById(WALLET.keys[keyId]?.wallets || [], walletId, copayerId),
  ) as Wallet | undefined;

  useEffect(() => {
    if (!wallet) {
      logManager.error(`[SendTo] Wallet ${walletId} is not available`);
      navigation.goBack();
    }
  }, [navigation, wallet, walletId]);

  return wallet ? <SendToContent wallet={wallet} /> : null;
};

export default SendTo;
