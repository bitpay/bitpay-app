import React, {useLayoutEffect, useState} from 'react';
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
import Button, {ButtonState} from '../../../../components/button/Button';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';
import {sleep} from '../../../../utils/helper-methods';
import {APP_NAME} from '../../../../constants/config';
import {useAppDispatch} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';

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
  const {t} = useTranslation();
  const {
    params: {walletName, currencyAbbreviation, usedAddresses, unusedAddresses},
  } = useRoute<RouteProp<WalletStackParamList, 'AllAddresses'>>();

  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [buttonState, setButtonState] = useState<ButtonState>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('All Addresses')}</HeaderTitle>,
    });
  });

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const sendAddresses = async () => {
    try {
      setButtonState('loading');
      const allAddresses =
        unusedAddresses?.concat(usedAddresses) || usedAddresses || [];

      const appName = APP_NAME;

      let body: string = t(
        ' Wallet "" Addresses\nOnly Main Addresses are shown.\n\n\n\'',
        {appName, walletName},
      );

      body += allAddresses
        .map(({address, path, uiTime}) => {
          return `*  ${address} xpub ${path.substring(1)} ${uiTime || ''}`;
        })
        .join('\n');

      const subject = appName + ' Addresses';
      // Works only on device
      await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
      setButtonState('success');
      await sleep(200);
      setButtonState(undefined);
    } catch (e) {
      console.log(e);
      setButtonState('failed');
      await sleep(500);
      setButtonState(undefined);
    }
  };

  return (
    <AddressesContainer>
      <ScrollView>
        {usedAddresses?.length ? (
          <>
            <VerticalPadding>
              <Title>{t('Addresses with balance')}</Title>

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

                    <H7>
                      {dispatch(FormatAmountStr(currencyAbbreviation, amount))}
                    </H7>
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
              <Title>{t('Unused addresses')}</Title>

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
        <Button onPress={sendAddresses} state={buttonState}>
          {t('Send Addresses by Email')}
        </Button>
      </CtaContainerAbsolute>
    </AddressesContainer>
  );
};

export default AllAddresses;
