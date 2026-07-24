import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import {
  ActiveOpacity,
  CtaContainer as _CtaContainer,
  HEIGHT,
  Hr,
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useTheme} from '../../../contexts';
import {BaseText, H5, SubText} from '../../../components/styled/Text';
import {Caution, NeutralSlate} from '../../../styles/colors';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {Effect, RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateCoinAddress,
  ValidateURI,
} from '../../../store/wallet/utils/validations';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../components/haptic-feedback/haptic';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {
  createWalletAddress,
  TranslateToBchCashAddress,
} from '../../../store/wallet/effects/address/address';
import {APP_NAME_UPPERCASE} from '../../../constants/config';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BchLegacyAddressInfo, Mismatch} from './ErrorMessages';
import {Recipient} from '../../../store/wallet/wallet.models';
import KeyWalletsRow, {KeyWallet} from '../../../components/list/KeyWalletsRow';
import type {WalletRowProps} from '../../../components/list/WalletRow';
import {
  useDebouncedSendToValidation,
  useSendToKeyAccounts,
} from '../screens/send/sendTo.utils';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  RecipientList,
  RecipientRowContainer,
  SendToOptionsContext,
} from '../screens/SendToOptions';
import {
  ExtractBitPayUriAddress,
  ExtractUriAmount,
} from '../../../store/wallet/utils/decode-uri';
import {sleep} from '../../../utils/helper-methods';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {useOngoingProcess} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';

const MemoizedKeyWalletsRow = React.memo(KeyWalletsRow);

const styles = StyleSheet.create({
  sendToAddressContainer: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  scrollViewContainer: {
    marginTop: 20,
    marginRight: 15,
    marginBottom: 0,
    marginLeft: 15,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 5,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  ctaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});

const CtaContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof _CtaContainer>) => (
  <_CtaContainer style={[styles.ctaContainer, style]} {...rest} />
);

const SendToAddress = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const logger = useLogger();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [walletSearchInput, setWalletSearchInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency.isoCode,
  );
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const keys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const {
    sendTo,
    recipientList,
    setRecipientListContext,
    setRecipientAmountContext,
    goToConfirmView,
    goToSelectInputsView,
  } = useContext(SendToOptionsContext);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'SendToOptions'>>();
  const {wallet, context} = route.params;
  const {currencyAbbreviation, id, network, chain} = wallet;

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

  const onErrorMessageDismiss = () => {
    setSearchInput('');
    setWalletSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:)/, ''),
      );
      setSearchInput(cashAddr);
      setWalletSearchInput(cashAddr);
      validateData(cashAddr);
    } catch {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const checkCoinAndNetwork =
    (data: any): Effect<boolean> =>
    dispatchEffect => {
      const isValid = ValidateCoinAddress(data, chain, network);

      if (isValid) {
        if (currencyAbbreviation === 'bch') {
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
        return true;
      } else {
        dispatchEffect(
          showBottomNotificationModal(Mismatch(onErrorMessageDismiss)),
        );
      }
      return false;
    };

  const validateData = async (text: string) => {
    const data = ValidateURI(text);
    if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        setErrorMessage('');
        setSearchInput('');
        setWalletSearchInput('');
        const extractedAmount = ExtractUriAmount(data.data);
        const addr = ExtractBitPayUriAddress(text);
        context === 'selectInputs'
          ? goToSelectInputsView({address: addr})
          : addRecipient({
              address: addr,
              amount: extractedAmount ? Number(extractedAmount[1]) : undefined,
            });
      }
    } else {
      setErrorMessage(text.length > 15 ? 'Invalid Address' : '');
    }
  };

  const validateDataRef = useRef(validateData);
  validateDataRef.current = validateData;
  const onSearchInputChange = useDebouncedSendToValidation(text => {
    setWalletSearchInput(text);
    validateDataRef.current(text);
  });
  const onAddressInputChange = useCallback(
    (text: string) => {
      setSearchInput(text);
      onSearchInputChange(text);
    },
    [onSearchInputChange],
  );

  const addRecipient = useCallback(
    (newRecipient: Recipient) => {
      setRecipientAmountContext(newRecipient);
    },
    [setRecipientAmountContext],
  );

  const onSendToWallet = useCallback(
    async (selectedWallet: KeyWallet) => {
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
          showOngoingProcess('GENERATING_ADDRESS');
          address = (await dispatch<any>(
            createWalletAddress({wallet: selectedWallet, newAddress: false}),
          )) as string;
          hideOngoingProcess();
          await sleep(500);
        }

        const newRecipient = {
          type: 'wallet',
          name: walletName || credentials.walletName,
          walletId,
          keyId,
          address,
        };

        context === 'selectInputs'
          ? goToSelectInputsView(newRecipient)
          : addRecipient(newRecipient);
      } catch (err) {
        const e = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error('[SendToWallet] ', e);
      }
    },
    [
      addRecipient,
      context,
      dispatch,
      goToSelectInputsView,
      hideOngoingProcess,
      showOngoingProcess,
    ],
  );

  const onWalletPress = useCallback(
    (selectedWallet: KeyWallet | WalletRowProps) => {
      if (!('credentials' in selectedWallet)) {
        return;
      }
      onSendToWallet(selectedWallet);
    },
    [onSendToWallet],
  );

  const renderItem = useCallback(
    ({item, index}: {item: Recipient; index: number}) => {
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
    [context, setRecipientAmountContext, setRecipientListContext, wallet],
  );

  useEffect(() => {
    const checkAddressForSelectInputOption = async () => {
      if (sendTo?.address) {
        await sleep(1000);
        validateDataRef.current(sendTo.address);
      }
    };
    checkAddressForSelectInputOption();
  }, [sendTo?.address]);

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        onSearchInputChange.cancel();
        setSearchInput('');
        setWalletSearchInput('');
        setErrorMessage('');
      }),
    [navigation, onSearchInputChange],
  );

  return (
    <>
      <View style={styles.sendToAddressContainer}>
        <SearchContainer style={{marginBottom: 0}}>
          <SearchInput
            placeholder={t('Enter address or select wallet')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={onAddressInputChange}
          />
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
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
                      validateData(data);
                    }
                  } catch (err) {
                    const e =
                      err instanceof Error ? err.message : JSON.stringify(err);
                    logManager.error('[OpenScanner SendToAddress] ', e);
                  }
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>
        {errorMessage ? (
          <BaseText style={styles.errorText}>{errorMessage}</BaseText>
        ) : null}

        <View style={{marginTop: 30}}>
          <H5>
            {recipientList?.length > 1
              ? t('Recipients') + ` (${recipientList?.length})`
              : t('Recipient')}
          </H5>
          <Hr />
          {recipientList && recipientList.length ? (
            <View style={{maxHeight: HEIGHT * 0.18}}>
              <FlatList
                data={recipientList}
                keyExtractor={(_item, index) => index.toString()}
                renderItem={({item, index}: {item: Recipient; index: number}) =>
                  renderItem({item, index})
                }
              />
            </View>
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
      </View>
      <ScrollView style={styles.scrollViewContainer}>
        <React.Profiler id="SendToAddress:wallets" onRender={logReactProfiler}>
          <View style={{marginTop: 10}}>
            <MemoizedKeyWalletsRow
              keyAccounts={keyAccounts}
              hideBalance={hideAllBalances}
              onPress={onWalletPress}
            />
          </View>
        </React.Profiler>
      </ScrollView>

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

export default SendToAddress;
