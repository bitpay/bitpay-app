import React, {useLayoutEffect, useState} from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate, White} from '../../../styles/colors';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import SwapButton from '../../../components/swap-button/SwapButton';
import Button from '../../../components/button/Button';
import {View} from 'react-native';

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

const AmountHeroContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const ActionContainer = styled.View`
  margin: 20px 0;
`;

const AmountText = styled(BaseText)`
  font-size: 50px;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
  margin-right: 5px;
`;

const CurrencySuperScript = styled.View`
  align-items: flex-start;
  justify-content: flex-start;
  height: 50px;
`;

const CurrencyText = styled(BaseText)`
  font-size: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const AmountContainer = styled.View`
  flex: 1;
  justify-content: space-between;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Amount = () => {
  const navigation = useNavigation();
  const sendMax = () => {};
  const swapList = ['USD', 'ETH'];
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');

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
          <VirtualKeyboard onChange={setAmount} reset={currency} />
          <ActionContainer>
            <Button>Continue</Button>
          </ActionContainer>
        </View>
      </AmountContainer>
    </SafeAreaView>
  );
};

export default Amount;
