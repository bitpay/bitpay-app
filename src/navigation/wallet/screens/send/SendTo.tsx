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

const ScanContainer = styled.TouchableOpacity``;

const WalletListContainer = styled.View``;

const SendTo = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'WalletDetails'>>();
  const {wallet} = route.params;
  const {currencyAbbreviation, id} = wallet;

  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  let walletList: SendToWalletRowProps[] = [];
  Object.entries(keys).forEach(([key, value]) => {
    const _wallets = value.wallets
      .filter(
        ({currencyAbbreviation: ca, id: wid}) =>
          ca == currencyAbbreviation.toLowerCase() && id !== wid,
      )
      .map(({balance = 0, id, img, currencyName}) => ({
        id,
        img,
        currencyName,
        currencyAbbreviation,
        cryptoBalance: balance,
        fiatBalance: formatFiatBalance(balance),
        keyId: key,
        keyName: value.keyName || 'My Key',
      }));

    _wallets.forEach((wallet: SendToWalletRowProps) => walletList.push(wallet));
  });

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

  const parseInput = (data: string) => {
    console.log(data);
  };

  return (
    <SafeAreaView>
      <ScrollView>
        <SearchContainer>
          <SearchInput
            placeholder={'Search contact or enter address'}
            placeholderTextColor={placeHolderTextColor}
            onChangeText={(text: string) => parseInput(text)}
          />
          <ScanContainer
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  contextHandler: data => {
                    try {
                      console.log(data);
                    } catch (err) {
                      console.log(err);
                    }
                  },
                },
              })
            }>
            <ScanSvg />
          </ScanContainer>
        </SearchContainer>

        <WalletListContainer>
          {walletList.map(w => (
            <SendToWalletRow wallet={w} key={w.keyId} onPress={() => {}} />
          ))}
        </WalletListContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendTo;
