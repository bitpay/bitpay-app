import React, {ReactElement, useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import {NeutralSlate} from '../../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {formatFiatBalance} from '../../../../utils/helper-methods';
import SendToWalletRow from '../../../../components/list/SendToWalletRow';
import {Key} from '../../../../store/wallet/wallet.models';
import debounce from 'lodash.debounce';
import {ValidateURI} from '../../../../store/wallet/utils/validations';
import {
  GetPayProUrl,
  GetWalletAddress,
} from '../../../../store/wallet/utils/address';
import {TouchableOpacity, View} from 'react-native';
import haptic from '../../../../components/haptic-feedback/haptic';

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

export interface SendToWalletRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  cryptoBalance: number;
  fiatBalance: string;
  keyId: string;
  keyName: string;
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

const BuildSendWalletRow = (
  keys: {[key in string]: Key},
  currentWalletId: string,
  currentCurrencyAbbrevation: string,
) => {
  let walletList: SendToWalletRowProps[] = [];

  Object.entries(keys).forEach(([key, value]) => {
    const wallets = value.wallets
      .filter(
        ({currencyAbbreviation, id}) =>
          currencyAbbreviation === currentCurrencyAbbrevation &&
          id !== currentWalletId,
      )
      .map(({balance = 0, id, img, currencyName, currencyAbbreviation}) => ({
        id,
        img,
        currencyName,
        currencyAbbreviation: currencyAbbreviation.toUpperCase(),
        cryptoBalance: balance,
        fiatBalance: formatFiatBalance(balance),
        keyId: key,
        keyName: value.keyName || 'My Key',
      }));

    wallets.forEach((_wallet: SendToWalletRowProps) =>
      walletList.push(_wallet),
    );
  });

  return walletList;
};

const SendTo = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'WalletDetails'>>();
  const {wallet} = route.params;
  const {currencyAbbreviation, id} = wallet;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  let walletList: SendToWalletRowProps[] = BuildSendWalletRow(
    keys,
    id,
    currencyAbbreviation.toLowerCase(),
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

  const validateSearchText = (text: string) => {
    const data = ValidateURI(text);

    if (data?.type === 'PayPro' || data?.type === 'InvoiceUri') {
      const invoiceUrl = GetPayProUrl(text);
      // TODO: Handle me
      return;
    }

    if (ValidDataTypes.includes(data?.type)) {
      //  TODO: Handle me
      return;
    }
  };

  const onSearchInputChange = (text: string) => {
    debounce(() => {
      validateSearchText(text);
    }, 300);
  };

  const onPressWallet = async ({
    id: walletId,
    keyId,
    currencyAbbreviation: ca,
  }: SendToWalletRowProps) => {
    const selectedWallet = keys[keyId].wallets.find(
      ({id: wid}) => wid === walletId,
    );

    try {
      const address = await GetWalletAddress(selectedWallet);
      navigation.navigate('Wallet', {
        screen: 'Amount',
        params: {id, keyId, address, currencyAbbreviation: ca},
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
          {walletList.map(w => (
            <SendToWalletRow
              wallet={w}
              key={w.keyId}
              onPress={selectedWallet => {
                onPressWallet(selectedWallet);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendTo;
