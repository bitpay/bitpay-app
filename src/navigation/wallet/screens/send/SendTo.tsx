import React, {useEffect, useLayoutEffect, useState} from 'react';
import {HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import {NeutralSlate} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../WalletStack';
import {RootState} from '../../../../store';
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

const SearchContainer = styled.View`
  flex-direction: row;
  border: 1px solid #9ba3ae;
  align-items: center;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  padding: 4px 0;
  margin-bottom: 20px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  padding: 0 10px;
  border-right-width: 1px;
  border-right-color: ${({theme: {dark}}) => (dark ? '#45484E' : '#ECEFFD')};
  height: 32px;
  color: ${({theme}) => theme.colors.text};
  background-color: transparent;
`;

const BuildKeyWalletRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbreviation: string,
  currentNetwork: string,
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
          fiatBalance: formatFiatAmount(balance.fiat, 'usd'),
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

  useEffect(() => {
    return navigation.addListener('blur', () =>
      setTimeout(() => setSearchInput(''), 300),
    );
  }, [navigation]);

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
  );

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    const cashAddr = TranslateToBchCashAddress(searchText);
    setSearchInput(cashAddr);
    validateAndNavigateToConfirm(cashAddr);
  };

  const checkCoinAndNetwork = (data: any, isPayPro?: boolean): boolean => {
    let isValid, addrData: CoinNetwork | null;
    if (isPayPro) {
      isValid =
        data?.chain === Currencies[currencyAbbreviation].chain &&
        data?.network === network;
    } else {
      addrData = GetCoinAndNetwork(data, network);
      isValid =
        currencyAbbreviation === addrData?.coin &&
        addrData?.network === network;
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
        dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
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

        const selected = payProOptions.paymentOptions.find(
          (option: PayProPaymentOption) =>
            option.selected &&
            currencyAbbreviation.toUpperCase() === option.currency,
        );
        if (selected) {
          const isValid = checkCoinAndNetwork(selected, true);
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
        logger.warn(formattedErrMsg);
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({errMsg: formattedErrMsg, title: 'Error'}),
          ),
        );
      }
    } else if (ValidDataTypes.includes(data?.type)) {
      if (checkCoinAndNetwork(text)) {
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

  const goToConfirm = (recipient: Recipient) => {
    navigation.navigate('Wallet', {
      screen: WalletScreens.AMOUNT,
      params: {
        currencyAbbreviation: wallet.currencyAbbreviation.toUpperCase(),
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
              },
            });
          } catch (err: any) {
            setButtonState('failed');
            const [errorMessageConfig] = await Promise.all([
              handleCreateTxProposalError(err),
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
  };
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
