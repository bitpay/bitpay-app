import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  BaseText,
  H5,
  H7,
  HeaderTitle,
  Paragraph,
  SubText,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Column,
  HeaderRightContainer,
  Hr,
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
  NotificationPrimary,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {Effect, RootState} from '../../../../store';
import {
  convertToFiat,
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getErrorString,
  sleep,
} from '../../../../utils/helper-methods';
import {
  Key,
  Recipient,
  TransactionOptionsContext,
  TxDetailsSendingTo,
  Wallet,
} from '../../../../store/wallet/wallet.models';
import {Rates} from '../../../../store/rate/rate.models';
import debounce from 'lodash.debounce';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateURI,
} from '../../../../store/wallet/utils/validations';
import {FlatList, TouchableOpacity, View} from 'react-native';
import haptic from '../../../../components/haptic-feedback/haptic';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {
  ExtractBitPayUriAddress,
  ExtractUriAmount,
  GetPayProUrl,
} from '../../../../store/wallet/utils/decode-uri';
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
import {IsUtxoCoin} from '../../../../store/wallet/utils/currency';
import {goToAmount, incomingData} from '../../../../store/scan/scan.effects';
import {useTranslation} from 'react-i18next';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import ContactRow, {
  ContactRowProps,
} from '../../../../components/list/ContactRow';
import {ReceivingAddress} from '../../../../store/bitpay-id/bitpay-id.models';
import {BitPayIdEffects} from '../../../../store/bitpay-id';
import {getCurrencyCodeFromCoinAndChain} from '../../../bitpay-id/utils/bitpay-id-utils';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {LogActions} from '../../../../store/log';
import Checkbox from '../../../../components/checkbox/Checkbox';
import _ from 'lodash';
import AmountModal from '../../../../components/amount/AmountModal';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import WalletIcons from '../../components/WalletIcons';
import Button from '../../../../components/button/Button';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../../store/wallet/effects/send/send';
import ContactIcon from '../../../../navigation/tabs/contacts/components/ContactIcon';

const AdvancedOptionsButton = styled.TouchableOpacity`
  height: 40px;
  flex-direction: row;
  align-items: center;
`;

const AdvancedOptionsButtonText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : NotificationPrimary)};
  margin-bottom: 5px;
`;

const CheckBoxContainer = styled.View`
  padding-left: 10px;
`;

const CheckBoxWrapper = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px;
`;

const CheckBoxCol = styled.View`
  display: flex;
  flex-direction: column;
`;

const CheckboxText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
`;

const RecipientContainer = styled.View`
  align-items: center;
  flex-direction: row;
  padding: 15px 0px;
`;

const RecipientOptionsContainer = styled.View`
  justify-content: flex-end;
  flex-direction: row;
  align-items: center;
  flex: 1;
`;
const ContactImageContainer = styled.View`
  height: 35px;
  width: 35px;
  display: flex;
  justify-content: center;
`;

const RecipientNameColumn = styled(Column)`
  margin-left: 20px;
  margin-right: 24px;
`;

export const RecipientList: React.FC<RecipientListProps> = ({
  recipient,
  wallet,
  deleteRecipient,
  setAmount,
}) => {
  let recipientData: TxDetailsSendingTo;

  if (recipient?.type === 'contact') {
    recipientData = {
      recipientName: recipient?.name,
      recipientAddress: recipient?.address,
      img: recipient?.type,
    };
  } else {
    recipientData = {
      recipientName: recipient.name,
      recipientAddress: recipient.address,
      img: wallet?.img || wallet?.currencyAbbreviation,
    };
  }

  return (
    <RecipientContainer>
      <ContactImageContainer>
        {recipient?.type === 'contact' ? (
          <ContactIcon
            name={recipient.name}
            coin={recipient.chain}
            size={45}
            chain={recipient.chain}
            tokenAddress={recipient.tokenAddress}
          />
        ) : (
          <CurrencyImage img={recipientData.img} size={45} />
        )}
      </ContactImageContainer>
      <RecipientNameColumn>
        {recipientData.recipientName ? (
          <H5 bold={false} numberOfLines={1} ellipsizeMode={'tail'}>
            {recipientData.recipientName}
          </H5>
        ) : (
          <H7 medium={true} numberOfLines={1} ellipsizeMode={'tail'}>
            {recipientData.recipientAddress}
          </H7>
        )}
      </RecipientNameColumn>
      <RecipientOptionsContainer>
        <TouchableOpacity
          activeOpacity={ActiveOpacity}
          onPress={() => {
            setAmount();
          }}>
          <H5>{recipient.amount}</H5>
        </TouchableOpacity>
        <TouchableOpacity
          style={{marginLeft: 8}}
          activeOpacity={ActiveOpacity}
          onPress={() => deleteRecipient()}>
          <WalletIcons.Delete />
        </TouchableOpacity>
      </RecipientOptionsContainer>
    </RecipientContainer>
  );
};

interface RecipientListProps {
  recipient: Recipient;
  wallet: Wallet;
  deleteRecipient: () => void;
  setAmount: () => void;
}

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const SendToContainer = styled.FlatList`
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

const SelectInputContainer = styled.TouchableOpacity`
  margin: 0 0 0 20px;
`;

const SelectOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : NotificationPrimary)};
  font-size: 13px;
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
        ({currencyAbbreviation, chain, id, network, credentials}) =>
          currencyAbbreviation.toLowerCase() ===
            currentCurrencyAbbreviation.toLowerCase() &&
          chain.toLowerCase() === currentChain.toLowerCase() &&
          (IsUtxoCoin(currencyAbbreviation) ||
            (!IsUtxoCoin(currencyAbbreviation) && id !== currentWalletId)) &&
          network === currentNetwork &&
          credentials?.walletName
            ?.toLowerCase()
            .includes(searchInput.toLowerCase()) &&
          credentials.isComplete(),
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
          currencyAbbreviation:
            formatCurrencyAbbreviation(currencyAbbreviation),
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
  const route = useRoute<RouteProp<WalletGroupParamList, 'SendTo'>>();
  const [selectInputOption, setSelectInputOption] = useState(false);
  const [multiSendOption, setMultiSendOption] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(true);

  const {keys} = useAppSelector(({WALLET}: RootState) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);

  const allContacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? LightBlack : Slate30;
  const [searchInput, setSearchInput] = useState('');
  const [recipientList, setRecipientList] = useState<Recipient[]>([]);
  const [searchIsEmailAddress, setSearchIsEmailAddress] = useState(false);
  const [emailAddressSearchPromise, setEmailAddressSearchPromise] = useState<
    Promise<ReceivingAddress[]>
  >(Promise.resolve([]));
  const [recipientAmount, setRecipientAmount] = useState<{
    showModal: boolean;
    recipient?: Recipient;
    index?: number;
    updateRecipient?: boolean;
  }>({showModal: false});

  const {wallet} = route.params;
  const {currencyAbbreviation, id, chain, network} = wallet;

  const isUtxo = IsUtxoCoin(wallet?.currencyAbbreviation);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Send To')}</HeaderTitle>,
    });
  });

  const setMultiSendRecipientList = (
    recipient: Recipient,
    index?: number,
    removeRecipient?: boolean,
    updateRecipient?: boolean,
  ) => {
    let newRecipientList: Recipient[] = _.cloneDeep(recipientList);
    if (removeRecipient) {
      newRecipientList.splice(index!, 1);
    } else if (updateRecipient) {
      newRecipientList[index!] = recipient;
    } else {
      newRecipientList = [...newRecipientList, recipient];
    }

    setRecipientList(newRecipientList);
  };

  const setMultiSendRecipientAmount = (
    recipient: Recipient,
    index?: number,
    updateRecipient?: boolean,
  ) => {
    if (recipient.amount && !updateRecipient) {
      setMultiSendRecipientList(recipient);
    } else {
      setRecipientAmount({showModal: true, recipient, index, updateRecipient});
    }
  };

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
      selectInputOption
        ? navigation.navigate('SelectInputs', {
            recipient: {address: text},
            wallet,
          })
        : multiSendOption
        ? (() => {
            const extractedAmount = ExtractUriAmount(text);
            const addr = ExtractBitPayUriAddress(text);
            addRecipient({
              address: addr,
              amount: extractedAmount ? Number(extractedAmount[1]) : undefined,
            });
          })()
        : await dispatch(
            incomingData(text, {wallet, context, name, email, destinationTag}),
          );
      setSearchInput('');
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

      selectInputOption
        ? navigation.navigate('SelectInputs', {
            recipient,
            wallet,
          })
        : multiSendOption
        ? addRecipient(recipient)
        : dispatch(
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

  const onSendToContact = async (contact: ContactRowProps) => {
    try {
      if (contact) {
        selectInputOption
          ? navigation.navigate('SelectInputs', {
              recipient: {type: 'contact', ...contact},
              wallet,
            })
          : multiSendOption
          ? setMultiSendRecipientAmount({
              type: 'contact',
              ...contact,
            })
          : validateAndNavigateToConfirm(contact.address, {
              context: 'contact',
              name: contact.name,
              destinationTag: contact.tag || contact.destinationTag,
            });
      }
    } catch (err) {
      logger.error(`Send To [Contacts]: ${getErrorString(err)}`);
    }
  };

  const renderRecipientList = useCallback(
    ({item, index}) => {
      return (
        <RecipientList
          recipient={item}
          wallet={wallet}
          deleteRecipient={() => setMultiSendRecipientList(item, index, true)}
          setAmount={() => setMultiSendRecipientAmount(item, index, true)}
        />
      );
    },
    [wallet, setMultiSendRecipientList, setMultiSendRecipientAmount],
  );

  const addRecipient = (newRecipient: Recipient) => {
    setMultiSendRecipientAmount(newRecipient);
  };

  const goToConfirmView = async () => {
    try {
      dispatch(startOnGoingProcessModal('LOADING'));
      const amount = _.sumBy(recipientList, 'amount');
      const tx = {
        wallet,
        recipient: recipientList[0],
        recipientList,
        amount,
        context: 'multisend' as TransactionOptionsContext,
      };
      const {txDetails, txp} = (await dispatch<any>(
        createProposalAndBuildTxDetails(tx),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      navigation.navigate('Confirm', {
        wallet,
        recipient: recipientList[0],
        recipientList,
        txp,
        txDetails,
        amount,
      });
    } catch (err: any) {
      const errorMessageConfig = (
        await Promise.all([
          dispatch(handleCreateTxProposalError(err)),
          sleep(500),
        ])
      )[0];
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
        }),
      );
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return multiSendOption ? (
          <HeaderRightContainer>
            <Button
              disabled={!recipientList[0]}
              buttonType="pill"
              onPress={() => goToConfirmView()}>
              {t('Continue')}
            </Button>
          </HeaderRightContainer>
        ) : null;
      },
    });
  }, [multiSendOption, recipientList]);

  return (
    <SafeAreaView>
      <SendToContainer
        contentContainerStyle={{
          paddingBottom: 50,
        }}
        ListHeaderComponent={
          <>
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
                  navigation.navigate('ScanRoot', {
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
                  });
                }}>
                <ScanSvg />
              </TouchableOpacity>
            </SearchContainer>

            {isUtxo ? (
              <CheckBoxContainer>
                <AdvancedOptionsButton
                  accessibilityLabel="show-advanced-options"
                  onPress={() => {
                    setShowAdvancedOptions(!showAdvancedOptions);
                  }}>
                  {showAdvancedOptions ? (
                    <AdvancedOptionsButtonText>
                      {t('Hide Advanced Options')}
                    </AdvancedOptionsButtonText>
                  ) : (
                    <AdvancedOptionsButtonText>
                      {t('Show Advanced Options')}
                    </AdvancedOptionsButtonText>
                  )}
                </AdvancedOptionsButton>
                {showAdvancedOptions ? (
                  <>
                    <CheckBoxWrapper>
                      <Checkbox
                        radio={true}
                        onPress={() => {
                          setSelectInputOption(!selectInputOption);
                          setMultiSendOption(false);
                        }}
                        checked={selectInputOption}
                      />
                      <CheckBoxCol>
                        <SelectInputContainer
                          onPress={() => {
                            setSelectInputOption(!selectInputOption);
                            setMultiSendOption(false);
                          }}>
                          <SelectOptionText>
                            {t('Select Inputs for this Transaction')}
                          </SelectOptionText>
                          <CheckboxText>
                            {t("Choose which inputs you'd like to use")}
                          </CheckboxText>
                        </SelectInputContainer>
                      </CheckBoxCol>
                    </CheckBoxWrapper>
                    <CheckBoxWrapper>
                      <Checkbox
                        radio={true}
                        onPress={() => {
                          setMultiSendOption(!multiSendOption);
                          setSelectInputOption(false);
                        }}
                        checked={multiSendOption}
                      />
                      <CheckBoxCol>
                        <SelectInputContainer
                          onPress={() => {
                            setMultiSendOption(!multiSendOption);
                            setSelectInputOption(false);
                          }}>
                          <SelectOptionText>
                            {t('Transfer to Multiple Recipients')}
                          </SelectOptionText>
                          <CheckboxText>
                            {t('Send crypto to multiple contacts or addresses')}
                          </CheckboxText>
                        </SelectInputContainer>
                      </CheckBoxCol>
                    </CheckBoxWrapper>
                  </>
                ) : null}
              </CheckBoxContainer>
            ) : null}

            {multiSendOption && recipientList?.length > 0 ? (
              <View style={{marginTop: 20}}>
                <View style={{marginBottom: 10}}>
                  <H5>
                    {recipientList?.length > 1
                      ? t('Recipients') + ` (${recipientList?.length})`
                      : t('Recipient')}
                  </H5>
                  <Hr />
                </View>
                {recipientList && recipientList.length ? (
                  <FlatList
                    data={recipientList}
                    keyExtractor={(_item, index) => index.toString()}
                    renderItem={renderRecipientList}
                  />
                ) : null}
              </View>
            ) : multiSendOption ? (
              <SubText style={{textAlign: 'center', marginTop: 10}}>
                {t(
                  'To get started, you’ll need to enter a valid address or select an existing contact or wallet.',
                )}
              </SubText>
            ) : null}

            {searchIsEmailAddress ? (
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={async () => {
                  const email = searchInput.toLowerCase();
                  const emailReceivingAddresses =
                    await emailAddressSearchPromise;
                  const addressMatchingCurrency = emailReceivingAddresses.find(
                    ({coin, chain: addressChain}) =>
                      currencyAbbreviation.toLowerCase() ===
                        coin.toLowerCase() &&
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
                                <EmailText>{email}</EmailText> is not yet able
                                to receive crypto to their email.
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
                      onPress={() => onSendToContact(item)}
                    />
                  );
                })}
              </ContactContainer>
            ) : null}

            <View style={{marginTop: 10}}>
              <KeyWalletsRow
                keyWallets={keyWallets}
                hideBalance={hideAllBalances}
                onPress={(selectedWallet: KeyWallet) => {
                  onSendToWallet(selectedWallet);
                }}
              />
            </View>
          </>
        }
        data={[]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({item, index}) => <></>}
        keyboardShouldPersistTaps={'handled'}
      />

      <AmountModal
        isVisible={recipientAmount.showModal}
        cryptoCurrencyAbbreviation={currencyAbbreviation}
        chain={chain}
        onClose={() => {
          setRecipientAmount({showModal: false});
        }}
        onSubmit={amount => {
          setRecipientAmount({showModal: false});
          setMultiSendRecipientList(
            {...recipientAmount.recipient!, amount},
            recipientAmount.index,
            false,
            recipientAmount.updateRecipient,
          );
        }}
      />
    </SafeAreaView>
  );
};

export default SendTo;
