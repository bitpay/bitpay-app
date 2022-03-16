import React, {useLayoutEffect} from 'react';
import {BaseText, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  Hr,
  ScreenGutter,
  SettingTitle,
  SettingView,
} from '../../../../components/styled/Containers';
import {Linking, TouchableOpacity, View} from 'react-native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {SlateDark, White} from '../../../../styles/colors';
import Clipboard from '@react-native-community/clipboard';
import Button from '../../../../components/button/Button';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';

export type AllAddressesParamList = {
  walletName: string;
  usedAddresses?: any[];
  unusedAddresses?: any[];
  currencyAbbreviation: string;
};

const AddressesContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: 20px 0 65px;
  padding: 0 ${ScreenGutter};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const SubText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AllAddresses = () => {
  const {
    params: {walletName, currencyAbbreviation, usedAddresses, unusedAddresses},
  } = useRoute<RouteProp<WalletStackParamList, 'AllAddresses'>>();

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>All Addresses</HeaderTitle>,
    });
  });

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const sendAddresses = () => {
    try {
      const allAddresses =
        unusedAddresses?.concat(usedAddresses) || usedAddresses || [];

      // TODO: Get app name
      const appName = 'BitPay';

      let body: string =
        appName +
        ' Wallet "' +
        walletName +
        '" Addresses\n  Only Main Addresses are  shown.\n\n';
      body += '\n';
      body += allAddresses
        .map(({address, path, uiTime}) => {
          return `*  ${address} xpub ${path.substring(1)} ${uiTime}`;
        })
        .join('\n');

      const subject = appName + ' Addresses';
      Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <AddressesContainer>
      <ScrollView>
        {usedAddresses?.length ? (
          <>
            <VerticalPadding>
              <Title>Addresses with balance</Title>

              {usedAddresses.map(({address, amount}, index) => (
                <View key={index}>
                  <SettingView>
                    <View>
                      <TouchableOpacity
                        style={{justifyContent: 'center'}}
                        activeOpacity={ActiveOpacity}
                        onPress={() => copyText(address)}>
                        <SettingTitle
                          numberOfLines={1}
                          ellipsizeMode={'tail'}
                          style={{maxWidth: 250}}>
                          {address}
                        </SettingTitle>
                      </TouchableOpacity>
                    </View>

                    <H7>{FormatAmountStr(currencyAbbreviation, amount)}</H7>
                  </SettingView>

                  <Hr />
                </View>
              ))}
            </VerticalPadding>
          </>
        ) : null}

        {unusedAddresses?.length ? (
          <>
            <VerticalPadding>
              <Title>Unused addresses</Title>

              {unusedAddresses.map(({address, path, uiTime}, index) => (
                <View key={index}>
                  <VerticalPadding>
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() => copyText(address)}>
                      <SettingTitle numberOfLines={1} ellipsizeMode={'tail'}>
                        {address}
                      </SettingTitle>
                    </TouchableOpacity>

                    <SubText>
                      {path} {uiTime}
                    </SubText>
                  </VerticalPadding>

                  <Hr />
                </View>
              ))}
            </VerticalPadding>
          </>
        ) : null}
      </ScrollView>

      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button onPress={sendAddresses}>Send Addresses by Email</Button>
      </CtaContainerAbsolute>
    </AddressesContainer>
  );
};

export default AllAddresses;
