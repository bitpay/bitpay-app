import React, {useCallback, useContext, useState} from 'react';
import {
  ActiveOpacity,
  CtaContainer as _CtaContainer,
  HEIGHT,
  Hr,
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, H5, SubText} from '../../../components/styled/Text';
import {Caution, NeutralSlate} from '../../../styles/colors';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {Effect, RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import debounce from 'lodash.debounce';
import {
  CheckIfLegacyBCH,
  ValidDataTypes,
  ValidateURI,
} from '../../../store/wallet/utils/validations';
import {FlatList, TouchableOpacity, View} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {
  createWalletAddress,
  GetCoinAndNetwork,
  TranslateToBchCashAddress,
} from '../../../store/wallet/effects/address/address';
import {APP_NAME_UPPERCASE} from '../../../constants/config';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BchLegacyAddressInfo, Mismatch} from './ErrorMessages';
import {Recipient} from '../../../store/wallet/wallet.models';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import {BuildKeyWalletRow} from '../screens/send/SendTo';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
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
import {LogActions} from '../../../store/log';

const SendToAddressContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const ScrollViewContainer = styled.ScrollView`
  margin: 20px 15px 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 0;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 16px;
`;

const SendToAddress = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const {keys} = useAppSelector(({WALLET}: RootState) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {
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

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:)/, ''),
      );
      setSearchInput(cashAddr);
      validateData(cashAddr);
    } catch (error) {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const checkCoinAndNetwork =
    (data: any): Effect<boolean> =>
    dispatch => {
      const addrData = GetCoinAndNetwork(data, network, chain);
      const isValid =
        chain === addrData?.coin.toLowerCase() && addrData?.network === network;

      if (isValid) {
        return true;
      } else {
        // @ts-ignore
        if (currencyAbbreviation === 'bch' && network === addrData?.network) {
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

  const validateData = async (text: string) => {
    const data = ValidateURI(text);
    if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        setErrorMessage('');
        setSearchInput('');
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

  const onSearchInputChange = debounce((text: string) => {
    validateData(text);
  }, 300);

  const addRecipient = (newRecipient: Recipient) => {
    setRecipientAmountContext(newRecipient);
  };

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
        dispatch(startOnGoingProcessModal('GENERATING_ADDRESS'));
        address = (await dispatch<any>(
          createWalletAddress({wallet: selectedWallet, newAddress: false}),
        )) as string;
        dispatch(dismissOnGoingProcessModal());
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
      dispatch(LogActions.error('[SendToWallet] ', e));
    }
  };

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
      <SendToAddressContainer>
        <SearchContainer style={{marginBottom: 0}}>
          <SearchInput
            placeholder={t('Enter address or select wallet')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={(text: string) => {
              setSearchInput(text);
              onSearchInputChange(text);
            }}
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
                    dispatch(
                      LogActions.error('[OpenScanner SendToAddress] ', e),
                    );
                  }
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>
        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}

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
      </SendToAddressContainer>
      <ScrollViewContainer>
        <View style={{marginTop: 10}}>
          <KeyWalletsRow
            keyWallets={keyWallets}
            hideBalance={hideAllBalances}
            onPress={(selectedWallet: KeyWallet) => {
              onSendToWallet(selectedWallet);
            }}
          />
        </View>
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

export default SendToAddress;
