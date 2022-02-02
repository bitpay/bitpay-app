import React, {useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import {NeutralSlate} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {formatFiatBalance} from '../../../../utils/helper-methods';
import {Key, Wallet} from '../../../../store/wallet/wallet.models';
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
import {
  CoinNetwork,
  CreateWalletAddress,
  GetCoinAndNetwork,
} from '../../../../store/wallet/effects/send/address';
import KeyWalletsRow, {
  KeyWallets,
  KeyWalletsRowProps,
} from '../../../../components/list/KeyWalletsRow';
import {
  GetPayProDetails,
  GetPayProOptions,
  HandlePayPro,
  PayProOptions,
} from '../../../../store/wallet/effects/send/paypro';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../store/app/app.actions';
import {Currencies} from "../../../../constants/currencies";

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

export interface SendToWalletRowProps extends Wallet {
  fiatBalance: string;
  cryptoBalance: number;
}

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
    const wallets: KeyWallets[] = [];
    value.wallets
      .filter(
        ({currencyAbbreviation, id, credentials: {network}}) =>
          currencyAbbreviation === currentCurrencyAbbreviation &&
          id !== currentWalletId &&
          network === currentNetwork,
      )
      .map(wallet => {
        const {
          balance = 0,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;
        // Clone wallet to avoid altering store values
        const _wallet = merge(cloneDeep(wallet), {
          cryptoBalance: balance,
          fiatBalance: formatFiatBalance(balance),
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
  const route = useRoute<RouteProp<WalletStackParamList, 'SendTo'>>();
  const {wallet} = route.params;
  const {
    currencyAbbreviation,
    id,
    credentials: {network},
  } = wallet;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  let keyWallets: KeyWalletsRowProps[] = BuildKeyWalletRow(
    keys,
    id,
    currencyAbbreviation,
    network,
  );

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

  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  const checkCoinAndNetwork = (
    data: any,
    isPayPro?: boolean,
    searchText?: string,
  ): boolean => {
    let isValid, addrData: CoinNetwork | null;
    if (isPayPro) {
      isValid =
        data?.chain === Currencies[currencyAbbreviation].chain &&
        data?.network === network;
    } else {
      addrData = GetCoinAndNetwork(data, network);
      isValid =
        currencyAbbreviation == addrData?.coin && addrData?.network === network;
    }

    if (isValid) {
      return true;
    } else {
      // @ts-ignore
      let network = isPayPro ? data.network : addrData?.network;

      if (currencyAbbreviation === 'bch' && network === network && searchText) {
        const isLegacy = CheckIfLegacyBCH(searchText);
        // isLegacy ? showLegacyAddrMessage() : showErrorMessage();
      } else {
        // showErrorMessage();
      }
    }
    return false;
  };

  const dispatch = useDispatch();

  const validateSearchText = async (text: string) => {
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
          (option: PayProOptions) =>
            option.selected &&
            currencyAbbreviation.toUpperCase() === option.currency,
        );
        if (selected) {
          const isValid = checkCoinAndNetwork(selected, true, text);
          console.log(isValid);

          if (isValid) {
            dispatch(
              startOnGoingProcessModal(
                OnGoingProcessMessages.FETCHING_PAYMENT_OPTIONS,
              ),
            );
            const payProDetails = await GetPayProDetails({
              paymentUrl: payProOptions.payProUrl,
              coin: currencyAbbreviation,
            });
            dispatch(dismissOnGoingProcessModal());
            const confirmScreenParams = await HandlePayPro(
              payProDetails,
              undefined,
              payProOptions.payProUrl,
              currencyAbbreviation,
            );
            //TODO: Redirect me
            console.log(confirmScreenParams);
          }
        } else {
          // TODO: handle me
        }
      } catch (err) {
        console.log(err);
        console.log(BWCErrorMessage(err));
        dispatch(dismissOnGoingProcessModal());

        // onGoingProcessProvider.clear();
        // this.invalidAddress = true;
        // logger.warn(this.bwcErrorProvider.msg(err));
        // this.errorsProvider.showDefaultError(
        //     this.bwcErrorProvider.msg(err),
        // );
      }
      // TODO: Handle me
      return;
    }

    if (ValidDataTypes.includes(data?.type)) {
      //  TODO: Handle me
      return;
    }
  };

  const onSearchInputChange = debounce((text: string) => {
    validateSearchText(text);
  }, 300);

  const onPressWallet = async (selectedWallet: SendToWalletRowProps) => {
    try {
      const address = await CreateWalletAddress(selectedWallet);
      navigation.navigate('Wallet', {
        screen: 'Amount',
        params: {
          id: selectedWallet.id,
          address,
          currencyAbbreviation: selectedWallet.currencyAbbreviation,
        },
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView>
      <ScrollView>
        <SearchContainer>
          <SearchInput
            placeholder={'Search contact or enter address'}
            placeholderTextColor={placeHolderTextColor}
            onChangeText={(text: string) => {
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
                  contextHandler: data => {
                    try {
                      if (data) {
                        validateSearchText(data);
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
            onPress={(selectedWallet: SendToWalletRowProps) => {
              onPressWallet(selectedWallet);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendTo;
