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
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {Effect, RootState} from '../../../../store';
import {getErrorString, sleep} from '../../../../utils/helper-methods';
import {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {Rates} from '../../../../store/rate/rate.models';
import debounce from 'lodash.debounce';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateCoinAddress,
  ValidateURI,
} from '../../../../store/wallet/utils/validations';
import {Linking, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../../components/haptic-feedback/haptic';
import {GetPayProUrl} from '../../../../store/wallet/utils/decode-uri';
import KeyWalletsRow, {
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
  IsVMChain,
  IsUtxoChain,
  IsOtherChain,
  IsEVMChain,
  IsSVMChain,
} from '../../../../store/wallet/utils/currency';
import {goToAmount, incomingData} from '../../../../store/scan/scan.effects';
import {useTranslation} from 'react-i18next';
import {
  buildAccountList,
  buildAssetsByChain,
} from '../../../../store/wallet/utils/wallet';
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
import {LogActions} from '../../../../store/log';
import {Network, URL} from '../../../../constants';
import {AccountRowProps} from '../../../../components/list/AccountListRow';
import {AssetsByChainData} from '../AccountDetails';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import {keyBackupRequired} from '../../../../navigation/tabs/home/components/Crypto';

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

export const BuildKeyAccountRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
  currentChain: string,
  currentNetwork: Network,
  defaultAltCurrencyIsoCode: string,
  searchInput: string,
  rates: Rates,
  dispatch: AppDispatch,
  logger: any,
) => {
  let filteredKeys: KeyWalletsRowProps[] = [];
  filteredKeys = Object.entries(keys)
    .map(([key, value]) => {
      try {
        const updatedKey = {
          ...value,
          wallets: value.wallets,
        };
        const accountList = buildAccountList(
          updatedKey,
          defaultAltCurrencyIsoCode,
          rates,
          dispatch,
          {
            filterByHideWallet: true,
            filterByWalletOptions: true,
            network: currentNetwork,
            chain: currentChain,
            currencyAbbreviation: currentCurrencyAbbreviation,
            walletId: currentWalletId,
            searchInput,
          },
        );

        const mergedAccounts = accountList
          .map(account => {
            if (IsVMChain(account.chains[0])) {
              const assetsByChain = buildAssetsByChain(
                account,
                defaultAltCurrencyIsoCode,
              );
              return {...account, assetsByChain};
            }
            return account.wallets;
          })
          .filter(Boolean) as (
          | WalletRowProps[]
          | (AccountRowProps & {
              assetsByChain?: AssetsByChainData[];
            })
        )[];

        const getMaxFiatBalanceWallet = (
          wallets: WalletRowProps[],
          defaultWallet: any,
        ) => {
          return wallets.reduce(
            (max, w) =>
              w?.fiatBalance && w.fiatBalance > max.fiatBalance ? w : max,
            defaultWallet,
          );
        };

        const flatMergedAccounts = Object.values(mergedAccounts).flat();
        const accounts = flatMergedAccounts.filter(a => {
          !a.chain;
        });

        const mergedUtxoAndEvmAccounts = flatMergedAccounts.sort((a, b) => {
          const chainA = a.chains?.[0] ?? a.chain ?? '';
          const chainB = b.chains?.[0] ?? b.chain ?? '';
          const isEVMA = IsVMChain(chainA);
          const isEVMB = IsVMChain(chainB);

          const walletA = isEVMA
            ? getMaxFiatBalanceWallet(
                (a as AccountRowProps).wallets,
                (a as AccountRowProps).wallets[0],
              )
            : getMaxFiatBalanceWallet(
                flatMergedAccounts.filter(
                  wallet => wallet?.chain === a.chain,
                ) as WalletRowProps[],
                a,
              );

          const walletB = isEVMB
            ? getMaxFiatBalanceWallet(
                (b as AccountRowProps).wallets,
                (b as AccountRowProps).wallets[0],
              )
            : getMaxFiatBalanceWallet(
                flatMergedAccounts.filter(
                  wallet => wallet?.chain === b.chain,
                ) as WalletRowProps[],
                b,
              );

          const balanceA = walletA.fiatBalance || 0;
          const balanceB = walletB.fiatBalance || 0;

          return balanceB - balanceA;
        }) as
          | WalletRowProps[]
          | (AccountRowProps & {assetsByChain?: AssetsByChainData[]});
        return {
          key,
          keyName: value.keyName || 'My Key',
          backupComplete: value.backupComplete,
          accounts,
          mergedUtxoAndEvmAccounts,
        };
      } catch (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`Error while building key account row: ${errStr}`);
      }
    })
    .filter(Boolean) as KeyWalletsRowProps[];
  return filteredKeys;
};

const SendTo = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const route = useRoute<RouteProp<WalletGroupParamList, 'SendTo'>>();

  const {keys} = useAppSelector(({WALLET}: RootState) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);

  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [searchIsEmailAddress, setSearchIsEmailAddress] = useState(false);
  const [emailAddressSearchPromise, setEmailAddressSearchPromise] = useState<
    Promise<ReceivingAddress[]>
  >(Promise.resolve([]));

  const {wallet} = route.params;
  const {currencyAbbreviation, id, chain, network} = wallet;

  const isUtxo = IsUtxoChain(chain);
  const isXrp = IsOtherChain(chain);

  const selectInputOption: Option = {
    img: <Icons.SelectInputs />,
    title: t('Select Inputs for this Transaction'),
    description: t("Choose which inputs you'd like to use to send crypto."),
    onPress: async () => {
      await sleep(500);
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
    onPress: async () => {
      await sleep(500);
      navigation.navigate('SendToOptions', {
        title: t('Multiple Recipients'),
        wallet,
        context: 'multisend',
      });
    },
  };

  const BridgeToPolygon: Option = {
    img: <Icons.BridgeToPolygon />,
    title: t('Bridge to Polygon'),
    description: t('Transfer your assets to Polygon network'),
    onPress: () => {
      Linking.openURL(URL.POLYGON_BRIDGE);
    },
  };

  const BridgeToArbitrum: Option = {
    img: <Icons.BridgeToPolygon />,
    title: t('Bridge to Arbitrum'),
    description: t('Transfer your assets to Arbitrum network'),
    onPress: () => {
      Linking.openURL(URL.ARBITRUM_BRIDGE);
    },
  };

  const BridgeToBase: Option = {
    img: <Icons.BridgeToPolygon />,
    title: t('Bridge to Base'),
    description: t('Transfer your assets to Base network'),
    onPress: () => {
      Linking.openURL(URL.BASE_BRIDGE);
    },
  };

  const BridgeToOptimism: Option = {
    img: <Icons.BridgeToPolygon />,
    title: t('Bridge to Optimism'),
    description: t('Transfer your assets to Optimism network'),
    onPress: () => {
      Linking.openURL(URL.OPTIMISM_BRIDGE);
    },
  };

  const bridgeOptions: Array<{chain: string; option: Option}> = [
    {chain: 'matic', option: BridgeToPolygon},
    {chain: 'arb', option: BridgeToArbitrum},
    {chain: 'base', option: BridgeToBase},
    {chain: 'op', option: BridgeToOptimism},
  ];

  const assetOptions: Array<Option> = isUtxo
    ? [multisendOption, selectInputOption]
    : bridgeOptions.reduce(
        (acc: Array<Option>, {chain: bridgeChain, option}) => {
          if (chain === bridgeChain || chain === 'eth') {
            acc.push(option);
          }
          return acc;
        },
        [],
      );

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

  const keyAccounts: KeyWalletsRowProps[] = BuildKeyAccountRow(
    keys,
    id,
    currencyAbbreviation,
    chain,
    network,
    defaultAltCurrency.isoCode,
    searchInput,
    rates,
    dispatch,
    logger,
  );

  const contacts = useMemo(() => {
    const normalizedSearch = searchInput.toLowerCase();

    const matchesContact = (contact: ContactRowProps) =>
      contact.network === network &&
      (contact.name.toLowerCase().includes(normalizedSearch) ||
        contact.email?.toLowerCase().includes(normalizedSearch));

    return allContacts.filter(contact => {
      if (isUtxo || isXrp) {
        return (
          contact.coin === currencyAbbreviation.toLowerCase() &&
          contact.chain === chain.toLowerCase() &&
          matchesContact(contact)
        );
      }

      if (IsEVMChain(chain)) {
        return IsEVMChain(contact.chain) && matchesContact(contact);
      }

      if (IsSVMChain(chain)) {
        return IsSVMChain(contact.chain) && matchesContact(contact);
      }

      return false;
    });
  }, [allContacts, currencyAbbreviation, chain, network, searchInput]);

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:|bchreg:)/, ''),
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

          dispatch(
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
        dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_OPTIONS'));

        const payProOptions = await dispatch(GetPayProOptions(invoiceUrl));
        await sleep(500);
        dispatch(dismissOnGoingProcessModal());
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
        dispatch(dismissOnGoingProcessModal());
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
    const {context, name, email, destinationTag, searching} = opts;
    if (isEmailAddress(text.trim())) {
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

  const onSendToWallet = async (selectedWallet: Wallet) => {
    try {
      const {
        credentials,
        currencyAbbreviation: currency,
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
        currency,
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
              validateAndNavigateToConfirm(text);
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
              navigation.navigate('ScanRoot', {
                onScanComplete: data => {
                  try {
                    if (data) {
                      validateAndNavigateToConfirm(data);
                    }
                  } catch (err) {
                    const e =
                      err instanceof Error ? err.message : JSON.stringify(err);
                    dispatch(LogActions.error('[OpenScanner SendTo] ', e));
                  }
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
            keyAccounts={keyAccounts}
            hideBalance={hideAllBalances}
            onPress={(selectedWallet: Wallet) => {
              const selectedKey = keys[selectedWallet.keyId];
              if (selectedKey.backupComplete) {
                onSendToWallet(selectedWallet);
              } else {
                logger.debug('Key selected. Needs backup.');
                dispatch(
                  showBottomNotificationModal(
                    keyBackupRequired(
                      selectedKey,
                      navigation,
                      dispatch,
                      'send',
                    ),
                  ),
                );
              }
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendTo;
