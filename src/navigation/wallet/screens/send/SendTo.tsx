import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  BaseText,
  HeaderTitle,
  Paragraph,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
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
  Midnight,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {Effect, RootState} from '../../../../store';
import {
  convertToFiat,
  formatFiatAmount,
  getErrorString,
  sleep,
} from '../../../../utils/helper-methods';
import {Key} from '../../../../store/wallet/wallet.models';
import {Rates} from '../../../../store/rate/rate.models';
import debounce from 'lodash.debounce';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateURI,
} from '../../../../store/wallet/utils/validations';
import {TouchableOpacity, View} from 'react-native';
import haptic from '../../../../components/haptic-feedback/haptic';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {GetPayProUrl} from '../../../../store/wallet/utils/decode-uri';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../../components/list/KeyWalletsRow';
import {
  GetPayProOptions,
  GetInvoiceCurrency,
  PayProPaymentOption,
} from '../../../../store/wallet/effects/paypro/paypro';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {BchLegacyAddressInfo, Mismatch} from '../../components/ErrorMessages';
import {
  CoinNetwork,
  createWalletAddress,
  GetCoinAndNetwork,
  TranslateToBchCashAddress,
} from '../../../../store/wallet/effects/address/address';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {IsUtxoCoin} from '../../../../store/wallet/utils/currency';
import {goToAmount, incomingData} from '../../../../store/scan/scan.effects';
import {useTranslation} from 'react-i18next';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import Settings from '../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../components/OptionsSheet';
import Icons from '../../components/WalletIcons';
import ContactRow from '../../../../components/list/ContactRow';
import {ReceivingAddress} from '../../../../store/bitpay-id/bitpay-id.models';
import {BitPayIdEffects} from '../../../../store/bitpay-id';
import {getCurrencyCodeFromCoinAndChain} from '../../../bitpay-id/utils/bitpay-id-utils';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {LogActions} from '../../../../store/log';

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  flex: 1;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ContactContainer = styled.View`
  margin-top: 20px;
`;

export const ContactTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-bottom: 10px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: 1px;
  margin-bottom: 10px;
`;

export const ContactTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 10px;
`;

const EmailContainer = styled.View`
  flex-direction: row;
  margin-top: 10px;
`;

const EmailIconContainer = styled.View`
  align-items: center;
  background-color: ${({theme}) => (theme.dark ? Midnight : '#EDF0FE')};
  border-radius: 50px;
  justify-content: center;
  margin-right: 13px;
  height: 50px;
  width: 50px;
`;

const EmailTextContainer = styled.View`
  justify-content: center;
`;

const EmailText = styled(Paragraph)`
  font-weight: 600;
`;

const InfoSheetMessage = styled.View`
  padding: 20px 0;
`;

const isEmailAddress = (text: string) => {
  if (!text.includes('@')) {
    return false;
  }
  const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
  return reg.test(text);
};

export const BuildKeyWalletRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
  currentChain: string,
  currentNetwork: string,
  defaultAltCurrencyIsoCode: string,
  searchInput: string,
  rates: Rates,
  dispatch: AppDispatch,
) => {
  let filteredKeys: KeyWalletsRowProps<KeyWallet>[] = [];
  Object.entries(keys).forEach(([key, value]) => {
    const wallets: KeyWallet[] = [];
    value.wallets
      .filter(({hideWallet}) => !hideWallet)
      .filter(
        ({
          currencyAbbreviation,
          chain,
          id,
          network,
          credentials: {walletName},
        }) =>
          currencyAbbreviation.toLowerCase() ===
            currentCurrencyAbbreviation.toLowerCase() &&
          chain.toLowerCase() === currentChain.toLowerCase() &&
          id !== currentWalletId &&
          network === currentNetwork &&
          walletName.toLowerCase().includes(searchInput.toLowerCase()),
      )
      .map(wallet => {
        const {
          balance,
          hideWallet,
          currencyAbbreviation,
          network,
          chain,
          credentials: {walletName: fallbackName},
          walletName,
          tokenAddress,
        } = wallet;
        // Clone wallet to avoid altering store values
        const _wallet = merge(cloneDeep(wallet), {
          cryptoBalance: balance.crypto,
          cryptoLockedBalance: '',
          fiatBalance: formatFiatAmount(
            convertToFiat(
              dispatch(
                toFiat(
                  balance.sat,
                  defaultAltCurrencyIsoCode,
                  currencyAbbreviation,
                  chain,
                  rates,
                  tokenAddress,
                ),
              ),
              hideWallet,
              network,
            ),
            defaultAltCurrencyIsoCode,
          ),
          fiatLockedBalance: '',
          currencyAbbreviation: currencyAbbreviation.toUpperCase(),
          network,
          walletName: walletName || fallbackName,
        });
        wallets.push(_wallet);
      });
    if (wallets.length) {
      const {keyName = 'My Key'} = value;
      filteredKeys.push({key, keyName, wallets});
    }
  });
  return filteredKeys;
};

const SendTo = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const route = useRoute<RouteProp<WalletStackParamList, 'SendTo'>>();

  const {keys} = useAppSelector(({WALLET}: RootState) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);

  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? LightBlack : Slate30;
  const [searchInput, setSearchInput] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [searchIsEmailAddress, setSearchIsEmailAddress] = useState(false);
  const [emailAddressSearchPromise, setEmailAddressSearchPromise] = useState<
    Promise<ReceivingAddress[]>
  >(Promise.resolve([]));

  const {wallet} = route.params;
  const {currencyAbbreviation, id, chain, network} = wallet;

  const isUtxo = IsUtxoCoin(wallet?.currencyAbbreviation);

  const selectInputOption: Option = {
    img: <Icons.SelectInputs />,
    title: t('Select Inputs for this Transaction'),
    description: t("Choose which inputs you'd like to use to send crypto."),
    onPress: () => {
      navigation.navigate('Wallet', {
        screen: 'SendToOptions',
        params: {
          title: t('Select Inputs'),
          wallet,
          context: 'selectInputs',
        },
      });
    },
  };

  const multisendOption: Option = {
    img: <Icons.Multisend />,
    title: t('Transfer to Multiple Recipients'),
    description: t('Send crypto to multiple contacts or addresses.'),
    onPress: () => {
      navigation.navigate('Wallet', {
        screen: 'SendToOptions',
        params: {
          title: t('Multiple Recipients'),
          wallet,
          context: 'multisend',
        },
      });
    },
  };

  const assetOptions: Array<Option> = isUtxo
    ? [multisendOption, selectInputOption]
    : [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Send To')}</HeaderTitle>,
      headerRight: () =>
        assetOptions.length ? (
          <Settings
            onPress={() => {
              setShowWalletOptions(true);
            }}
          />
        ) : null,
    });
  });

  const keyWallets: KeyWalletsRowProps<KeyWallet>[] = BuildKeyWalletRow(
    keys,
    id,
    currencyAbbreviation,
    chain,
    network,
    defaultAltCurrency.isoCode,
    searchInput,
    rates,
    dispatch,
  );

  const contacts = useMemo(() => {
    return allContacts.filter(
      contact =>
        contact.coin === currencyAbbreviation.toLowerCase() &&
        contact.chain === chain.toLowerCase() &&
        contact.network === network &&
        (contact.name.toLowerCase().includes(searchInput.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchInput.toLowerCase())),
    );
  }, [allContacts, currencyAbbreviation, network, searchInput]);

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:)/, ''),
      );
      setSearchInput(cashAddr);
      validateAndNavigateToConfirm(cashAddr);
    } catch (error) {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const checkCoinAndNetwork =
    (data: any, isPayPro?: boolean): Effect<boolean> =>
    dispatch => {
      let isValid, addrData: CoinNetwork | null;
      if (isPayPro) {
        isValid =
          data?.chain?.toLowerCase() === chain.toLowerCase() &&
          data?.network.toLowerCase() === network.toLowerCase();
      } else {
        addrData = GetCoinAndNetwork(data, network, chain);
        isValid =
          chain === addrData?.coin.toLowerCase() &&
          network === addrData?.network;
      }

      if (isValid) {
        return true;
      } else {
        // @ts-ignore
        let addrNetwork = isPayPro ? data.network : addrData?.network;
        if (currencyAbbreviation === 'bch' && network === addrNetwork) {
          const isLegacy = CheckIfLegacyBCH(data);
          if (isLegacy) {
            const appName = APP_NAME_UPPERCASE;

            dispatch(
              showBottomNotificationModal(
                BchLegacyAddressInfo(appName, () => {
                  BchLegacyAddressInfoDismiss(data);
                }),
              ),
            );
          }
        }
      }
      return false;
    };

  const validateAddress = async (text: string) => {
    const data = ValidateURI(text);
    if (data?.type === 'PayPro' || data?.type === 'InvoiceUri') {
      try {
        const invoiceUrl = GetPayProUrl(text);
        dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_OPTIONS'));

        const payProOptions = await dispatch(GetPayProOptions(invoiceUrl));
        await sleep(500);
        dispatch(dismissOnGoingProcessModal());
        const invoiceCurrency = getCurrencyCodeFromCoinAndChain(
          GetInvoiceCurrency(currencyAbbreviation).toLowerCase(),
          chain,
        );
        const selected = payProOptions.paymentOptions.find(
          (option: PayProPaymentOption) =>
            option.selected && invoiceCurrency === option.currency,
        );
        if (selected) {
          const isValid = dispatch(checkCoinAndNetwork(selected, true));
          if (isValid) {
            return Promise.resolve(true);
          }
        } else {
          return Promise.resolve(false);
        }
      } catch (err) {
        const formattedErrMsg = BWCErrorMessage(err);
        await sleep(500);
        dispatch(dismissOnGoingProcessModal());
        logger.warn(formattedErrMsg);
        return Promise.resolve(false);
      }
    } else if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    } else {
      return Promise.resolve(false);
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
    const {context, name, email, destinationTag, searching} = opts;
    if (isEmailAddress(text.trim())) {
      setSearchIsEmailAddress(true);
      return;
    }
    setSearchIsEmailAddress(false);
    const isValid = await validateAddress(text);
    if (isValid) {
      await dispatch(
        incomingData(text, {wallet, context, name, email, destinationTag}),
      );
    } else if (!searching) {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const onSearchInputChange = debounce((text: string) => {
    validateAndNavigateToConfirm(text, {searching: true});
  }, 300);

  const onSendToWallet = async (selectedWallet: KeyWallet) => {
    try {
      const {
        credentials,
        id: walletId,
        keyId,
        walletName,
        receiveAddress,
        chain,
      } = selectedWallet;

      let address = receiveAddress;

      if (!address) {
        dispatch(startOnGoingProcessModal('GENERATING_ADDRESS'));
        address = await dispatch<Promise<string>>(
          createWalletAddress({wallet: selectedWallet, newAddress: false}),
        );
        dispatch(dismissOnGoingProcessModal());
      }

      const recipient = {
        type: 'wallet',
        name: walletName || credentials.walletName,
        walletId,
        keyId,
        address,
        currency: credentials.coin,
        chain,
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
      dispatch(dismissOnGoingProcessModal());
    }
  };

  useEffect(() => {
    const getReceivingAddresses = async () => {
      const email = searchInput.trim().toLowerCase();
      const searchPromise = dispatch(
        BitPayIdEffects.startFetchReceivingAddresses({
          email,
          currency: getCurrencyCodeFromCoinAndChain(
            currencyAbbreviation,
            wallet.chain,
          ),
        }),
      ).catch(_ => Promise.resolve([]));
      setEmailAddressSearchPromise(searchPromise);
      await searchPromise;
    };
    if (searchIsEmailAddress) {
      getReceivingAddresses();
    } else {
      setEmailAddressSearchPromise(Promise.resolve([]));
    }
  }, [
    searchIsEmailAddress,
    searchInput,
    dispatch,
    currencyAbbreviation,
    wallet.chain,
  ]);

  useEffect(() => {
    return navigation.addListener('blur', () =>
      setTimeout(() => setSearchInput(''), 300),
    );
  }, [navigation]);

  return (
    <SafeAreaView>
      <ScrollView keyboardShouldPersistTaps={'handled'}>
        <SearchContainer>
          <SearchInput
            placeholder={t('Search contact or enter address')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={(text: string) => {
              setSearchInput(text);
              onSearchInputChange(text);
            }}
          />
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              haptic('impactLight');
              dispatch(
                Analytics.track('Open Scanner', {
                  context: 'SendTo',
                }),
              );
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  onScanComplete: data => {
                    try {
                      if (data) {
                        validateAndNavigateToConfirm(data);
                      }
                    } catch (err) {
                      const e =
                        err instanceof Error
                          ? err.message
                          : JSON.stringify(err);
                      dispatch(LogActions.error('[OpenScanner SendTo] ', e));
                    }
                  },
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>

        {searchIsEmailAddress ? (
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={async () => {
              const email = searchInput.toLowerCase();
              const emailReceivingAddresses = await emailAddressSearchPromise;
              const addressMatchingCurrency = emailReceivingAddresses.find(
                ({coin, chain: addressChain}) =>
                  currencyAbbreviation.toLowerCase() === coin.toLowerCase() &&
                  chain.toLowerCase() === addressChain.toLowerCase(),
              );
              addressMatchingCurrency
                ? validateAndNavigateToConfirm(
                    addressMatchingCurrency.address,
                    {email},
                  )
                : dispatch(
                    showBottomNotificationModal({
                      type: 'warning',
                      title: 'Unable to Send to Contact',
                      message: '',
                      message2: (
                        <InfoSheetMessage>
                          <Paragraph>
                            <EmailText>{email}</EmailText> is not yet able to
                            receive crypto to their email.
                          </Paragraph>
                        </InfoSheetMessage>
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
            <EmailContainer>
              <EmailIconContainer>
                <SendLightSvg />
              </EmailIconContainer>
              <EmailTextContainer>
                <Paragraph>
                  Send to <EmailText>{searchInput.toLowerCase()}</EmailText>
                </Paragraph>
              </EmailTextContainer>
            </EmailContainer>
          </TouchableOpacity>
        ) : null}

        {contacts.length > 0 && !searchIsEmailAddress ? (
          <ContactContainer>
            <ContactTitleContainer>
              {ContactsSvg({})}
              <ContactTitle>{t('Contacts')}</ContactTitle>
            </ContactTitleContainer>

            {contacts.map((item, index) => {
              return (
                <ContactRow
                  key={index}
                  contact={item}
                  onPress={() => {
                    try {
                      if (item) {
                        validateAndNavigateToConfirm(item.address, {
                          context: 'contact',
                          name: item.name,
                          destinationTag: item.tag || item.destinationTag,
                        });
                      }
                    } catch (err) {
                      logger.error(
                        `Send To [Contacts]: ${getErrorString(err)}`,
                      );
                    }
                  }}
                />
              );
            })}
          </ContactContainer>
        ) : null}

        <OptionsSheet
          isVisible={showWalletOptions}
          closeModal={() => setShowWalletOptions(false)}
          options={assetOptions}
        />

        <View style={{marginTop: 10}}>
          <KeyWalletsRow
            keyWallets={keyWallets}
            hideBalance={hideAllBalances}
            onPress={(selectedWallet: KeyWallet) => {
              onSendToWallet(selectedWallet);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendTo;
