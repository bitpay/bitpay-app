import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {BaseText, HeaderTitle, Link} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import Clipboard from '@react-native-community/clipboard';
import {
  ScreenGutter,
  SearchContainer,
  SearchInput,
} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import ContactsSvg from '../../../../../assets/img/tab-icons/contacts.svg';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../WalletStack';
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
  PayProPaymentOption,
} from '../../../../store/wallet/effects/paypro/paypro';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {Currencies} from '../../../../constants/currencies';
import {
  AppDispatch,
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
  CoinNetwork,
  createWalletAddress,
  GetCoinAndNetwork,
  TranslateToBchCashAddress,
} from '../../../../store/wallet/effects/address/address';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {GetChain, IsUtxoCoin} from '../../../../store/wallet/utils/currency';
import {goToAmount, incomingData} from '../../../../store/scan/scan.effects';
import {useTranslation} from 'react-i18next';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import Settings from '../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../components/OptionsSheet';
import Icons from '../../components/WalletIcons';
import ContactRow from '../../../../components/list/ContactRow';

const ValidDataTypes: string[] = [
  'BitcoinAddress',
  'BitcoinCashAddress',
  'EthereumAddress',
  'RSKAddress',
  'RippleAddress',
  'DogecoinAddress',
  'LitecoinAddress',
  'RippleUri',
  'BitcoinUri',
  'BitcoinCashUri',
  'EthereumUri',
  'RSKUri',
  'DogecoinUri',
  'LitecoinUri',
  'BitPayUri',
];

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  flex: 1;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const PasteClipboardContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: 10px;
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

export const BuildKeyWalletRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
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
        ({currencyAbbreviation, id, credentials: {network, walletName}}) =>
          currencyAbbreviation.toLowerCase() ===
            currentCurrencyAbbreviation.toLowerCase() &&
          id !== currentWalletId &&
          network === currentNetwork &&
          walletName.toLowerCase().includes(searchInput.toLowerCase()),
      )
      .map(wallet => {
        const {
          balance,
          hideWallet,
          currencyAbbreviation,
          credentials: {network, walletName: fallbackName},
          walletName,
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
                  rates,
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
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [clipboardData, setClipboardData] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const {wallet} = route.params;
  const {
    currencyAbbreviation,
    id,
    credentials: {network},
  } = wallet;

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
          data?.chain ===
            Currencies[currencyAbbreviation.toLowerCase()].chain &&
          data?.network === network;
      } else {
        addrData = GetCoinAndNetwork(data, network);
        isValid =
          dispatch(GetChain(currencyAbbreviation)).toLowerCase() ===
            addrData?.coin.toLowerCase() && addrData?.network === network;
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
          } else {
            dispatch(
              showBottomNotificationModal(Mismatch(onErrorMessageDismiss)),
            );
          }
        } else {
          dispatch(
            showBottomNotificationModal(Mismatch(onErrorMessageDismiss)),
          );
        }
      }
      return false;
    };

  const validateAndNavigateToConfirm = async (
    text: string,
    context?: string,
    name?: string,
    destinationTag?: number,
  ) => {
    const data = ValidateURI(text);
    if (data?.type === 'PayPro' || data?.type === 'InvoiceUri') {
      try {
        const invoiceUrl = GetPayProUrl(text);
        dispatch(
          startOnGoingProcessModal(
            //  t('Fetching payment options...')
            t(OnGoingProcessMessages.FETCHING_PAYMENT_OPTIONS),
          ),
        );

        const payProOptions = await GetPayProOptions(invoiceUrl);
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        const selected = payProOptions.paymentOptions.find(
          (option: PayProPaymentOption) =>
            option.selected &&
            currencyAbbreviation.toUpperCase() === option.currency,
        );
        if (selected) {
          const isValid = dispatch(checkCoinAndNetwork(selected, true));
          if (isValid) {
            navigation.navigate('Wallet', {
              screen: WalletScreens.PAY_PRO_CONFIRM,
              params: {
                payProOptions,
                wallet,
              },
            });
          }
        } else {
          // TODO: handle me
        }
      } catch (err) {
        const formattedErrMsg = BWCErrorMessage(err);
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        logger.warn(formattedErrMsg);
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({errMsg: formattedErrMsg, title: 'Error'}),
          ),
        );
      }
    } else if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        setSearchInput(text);
        await sleep(0);
        dispatch(incomingData(text, {wallet, context, name, destinationTag}));
      }
    }
  };

  const onSearchInputChange = debounce((text: string) => {
    validateAndNavigateToConfirm(text);
  }, 300);

  const onSendToWallet = async (selectedWallet: KeyWallet) => {
    try {
      const {
        credentials,
        id: walletId,
        keyId,
        walletName,
        receiveAddress,
      } = selectedWallet;

      let address = receiveAddress;

      if (!address) {
        dispatch(
          startOnGoingProcessModal(
            // t('Generating Address')
            t(OnGoingProcessMessages.GENERATING_ADDRESS),
          ),
        );
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
      };

      dispatch(
        goToAmount({coin: wallet.currencyAbbreviation, recipient, wallet}),
      );
    } catch (err: any) {
      logger.error(`Send To: ${getErrorString(err)}`);
      dispatch(dismissOnGoingProcessModal());
    }
  };

  useEffect(() => {
    const getString = async () => {
      const clipboardData = await Clipboard.getString();
      setClipboardData(clipboardData);
    };
    getString();
  }, []);

  useEffect(() => {
    return navigation.addListener('blur', () =>
      setTimeout(() => setSearchInput(''), 300),
    );
  }, [navigation]);

  return (
    <SafeAreaView>
      <ScrollView>
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
                logSegmentEvent('track', 'Open Scanner', {
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
                      console.log(err);
                    }
                  },
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>

        {clipboardData ? (
          <PasteClipboardContainer
            activeOpacity={0.75}
            onPress={() => {
              haptic('impactLight');
              setSearchInput(clipboardData);
              validateAndNavigateToConfirm(clipboardData);
            }}>
            <Link>{t('Paste from clipboard')}</Link>
          </PasteClipboardContainer>
        ) : null}

        {contacts.length > 0 ? (
          <>
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
                        validateAndNavigateToConfirm(
                          item.address,
                          'contact',
                          item.name,
                          item.tag || item.destinationTag,
                        );
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
          </>
        ) : null}

        <OptionsSheet
          isVisible={showWalletOptions}
          closeModal={() => setShowWalletOptions(false)}
          options={assetOptions}
        />

        <View style={{marginTop: 10}}>
          <KeyWalletsRow
            keyWallets={keyWallets}
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
