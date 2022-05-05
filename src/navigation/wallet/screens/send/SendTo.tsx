import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ScreenGutter,
  SearchContainer,
  SearchInput,
} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import {NeutralSlate} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../WalletStack';
import {Effect, RootState} from '../../../../store';
import {formatFiatAmount, sleep} from '../../../../utils/helper-methods';
import {Key, Recipient} from '../../../../store/wallet/wallet.models';
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
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {Currencies} from '../../../../constants/currencies';
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
  CoinNetwork,
  createWalletAddress,
  GetCoinAndNetwork,
  TranslateToBchCashAddress,
} from '../../../../store/wallet/effects/address/address';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../../store/wallet/effects/send/send';
import {APP_NAME} from '../../../../constants/config';
import {GetChain} from '../../../../store/wallet/utils/currency';

const ValidDataTypes: string[] = [
  'BitcoinAddress',
  'BitcoinCashAddress',
  'EthereumAddress',
  'EthereumUri',
  'RippleAddress',
  'DogecoinAddress',
  'LitecoinAddress',
  'RippleUri',
  'BitcoinUri',
  'BitcoinCashUri',
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

const BuildKeyWalletRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
  currentNetwork: string,
  defaultAltCurrencyIsoCode: string,
) => {
  let filteredKeys: KeyWalletsRowProps[] = [];
  Object.entries(keys).forEach(([key, value]) => {
    const wallets: KeyWallet[] = [];
    value.wallets
      .filter(({hideWallet}) => !hideWallet)
      .filter(
        ({currencyAbbreviation, id, credentials: {network}}) =>
          currencyAbbreviation.toLowerCase() ===
            currentCurrencyAbbreviation.toLowerCase() &&
          id !== currentWalletId &&
          network === currentNetwork,
      )
      .map(wallet => {
        const {
          balance,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;
        // Clone wallet to avoid altering store values
        const _wallet = merge(cloneDeep(wallet), {
          cryptoBalance: balance.crypto,
          cryptoLockedBalance: '',
          fiatBalance: formatFiatAmount(
            balance.fiat,
            defaultAltCurrencyIsoCode,
          ),
          fiatLockedBalance: '',
          currencyAbbreviation: currencyAbbreviation.toUpperCase(),
          network,
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
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const route = useRoute<RouteProp<WalletStackParamList, 'SendTo'>>();

  const keys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Send To</HeaderTitle>,
      //TODO: Update me
      // headerRight: () => (
      //     <Settings
      //         onPress={() => {
      //         }}
      //     />
      // ),
    });
  });

  const {wallet} = route.params;

  const {
    currencyAbbreviation,
    id,
    credentials: {network},
  } = wallet;
  const keyWallets: KeyWalletsRowProps[] = BuildKeyWalletRow(
    keys,
    id,
    currencyAbbreviation,
    network,
    defaultAltCurrency.isoCode,
  );

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    const cashAddr = TranslateToBchCashAddress(searchText);
    setSearchInput(cashAddr);
    validateAndNavigateToConfirm(cashAddr);
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
            const appName = APP_NAME;

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

  const validateAndNavigateToConfirm = async (text: string) => {
    const data = ValidateURI(text);
    if (data?.type === 'PayPro' || data?.type === 'InvoiceUri') {
      try {
        const invoiceUrl = GetPayProUrl(text);
        dispatch(
          startOnGoingProcessModal(
            OnGoingProcessMessages.FETCHING_PAYMENT_OPTIONS,
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
        const recipient = {
          type: 'address',
          address: text,
        };
        setSearchInput(text);
        await sleep(0);
        goToConfirm(recipient);
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
          startOnGoingProcessModal(OnGoingProcessMessages.GENERATING_ADDRESS),
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
      };

      goToConfirm(recipient);
    } catch (err) {
      console.error(err);
    }
  };

  const goToConfirm = useCallback(
    (recipient: Recipient, opts?: any) => {
      navigation.navigate('Wallet', {
        screen: WalletScreens.AMOUNT,
        params: {
          opts: opts || {},
          currencyAbbreviationRouteParam:
            wallet.currencyAbbreviation.toUpperCase(),
          onAmountSelected: async (amount, setButtonState, opts) => {
            try {
              setButtonState('loading');
              const {txDetails, txp} = await dispatch(
                createProposalAndBuildTxDetails({
                  wallet,
                  recipient,
                  amount: Number(amount),
                  ...opts,
                }),
              );
              setButtonState('success');
              await sleep(300);
              navigation.navigate('Wallet', {
                screen: 'Confirm',
                params: {
                  wallet,
                  recipient,
                  txp,
                  txDetails,
                  amount: Number(amount),
                  sendMax: opts?.sendMax,
                },
              });
            } catch (err: any) {
              setButtonState('failed');
              const [errorMessageConfig] = await Promise.all([
                dispatch(handleCreateTxProposalError(err)),
                sleep(400),
              ]);
              dispatch(
                showBottomNotificationModal({
                  ...errorMessageConfig,
                  enableBackdropDismiss: false,
                  actions: [
                    {
                      text: 'OK',
                      action: () => {
                        setButtonState(undefined);
                      },
                    },
                  ],
                }),
              );
            }
          },
        },
      });
    },
    [dispatch, navigation, wallet],
  );

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
            placeholder={'Search contact or enter address'}
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

        <View>
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
