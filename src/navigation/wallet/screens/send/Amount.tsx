import React, {useLayoutEffect, useState} from 'react';
import {BaseText} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate, White} from '../../../../styles/colors';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import VirtualKeyboard from '../../../../components/virtual-keyboard/VirtualKeyboard';
import SwapButton from '../../../../components/swap-button/SwapButton';
import Button from '../../../../components/button/Button';
import {View} from 'react-native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {Recipient, Wallet} from '../../../../store/wallet/wallet.models';
import {createProposalAndBuildTxDetails} from '../../../../store/wallet/effects/send/send';
import {useAppDispatch} from '../../../../utils/hooks';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../store/app/app.actions';

const SendMax = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 17.5px;
  padding: 8px 15px;
`;

const SendMaxText = styled(BaseText)`
  line-height: 25px;
  font-size: 15px;
  color: ${({theme: {dark}}) => (dark ? White : '#434D5A')};
`;

const HeaderContainer = styled(HeaderRightContainer)`
  justify-content: center;
`;

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const SwapButtonContainer = styled.View`
  align-items: flex-end;
  margin-bottom: 20px;
`;

export const AmountHeroContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const ActionContainer = styled.View`
  margin: 20px 0;
`;

export const AmountText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '35px' : '50px')};
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
  margin-right: 5px;
`;

export const CurrencySuperScript = styled.View`
  align-items: flex-start;
  justify-content: flex-start;
  height: 50px;
`;

export const CurrencyText = styled(BaseText)`
  font-size: 20px;
  color: ${({theme}) => theme.colors.text};
`;

export const AmountContainer = styled.View`
  flex: 1;
  justify-content: space-between;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

export interface AmountParamList {
  wallet: Wallet;
  recipient: Recipient;
}

const Amount = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'Amount'>>();
  const {wallet, recipient} = route.params;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState('0');
  const currencyAbbreviation = wallet.currencyAbbreviation.toUpperCase();
  const [currency, setCurrency] = useState(currencyAbbreviation);
  const sendMax = () => {};
  const swapList = [currencyAbbreviation, 'USD'];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderContainer>
          <SendMax onPress={sendMax}>
            <SendMaxText>Send Max</SendMaxText>
          </SendMax>
        </HeaderContainer>
      ),
    });
  });

  const goToConfirm = async () => {
    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.GENERAL_AWAITING),
      );
      const {txDetails, txp} = await dispatch(
        createProposalAndBuildTxDetails({
          wallet,
          recipient,
          amount: Number(amount),
        }),
      );

      navigation.navigate('Wallet', {
        screen: 'Confirm',
        params: {wallet, recipient, txp, txDetails},
      });
      dispatch(dismissOnGoingProcessModal());
    } catch (err) {
      console.error(err);
      dispatch(dismissOnGoingProcessModal());
    }
  };

  return (
    <SafeAreaView>
      <AmountContainer>
        <View>
          <AmountHeroContainer>
            <AmountText>{amount || 0}</AmountText>
            <CurrencySuperScript>
              <CurrencyText>{currency}</CurrencyText>
            </CurrencySuperScript>
          </AmountHeroContainer>
          <SwapButtonContainer>
            <SwapButton swapList={swapList} onChange={setCurrency} />
          </SwapButtonContainer>
        </View>
        <View>
          <VirtualKeyboard onChange={val => setAmount(val)} reset={currency} />
          <ActionContainer>
            <Button disabled={!amount} onPress={goToConfirm}>
              Continue
            </Button>
          </ActionContainer>
        </View>
      </AmountContainer>
    </SafeAreaView>
  );
};

export default Amount;
