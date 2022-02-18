import React, {useEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {View} from 'react-native';
import VirtualKeyboard from '../../../../components/virtual-keyboard/VirtualKeyboard';
import Button from '../../../../components/button/Button';
import styled from 'styled-components/native';
import {
  AmountHeroContainer,
  AmountText,
  CurrencyText,
  CurrencySuperScript,
  AmountContainer,
} from '../send/Amount';

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const ActionContainer = styled.View`
  margin: 20px 0;
`;

const RequestSpecificAmount = () => {
  const route =
    useRoute<RouteProp<WalletStackParamList, 'RequestSpecificAmount'>>();
  const {wallet} = route.params;
  const {currencyAbbreviation} = wallet;
  const navigation = useNavigation();
  const [amount, setAmount] = useState('0');
  const [reset, setReset] = useState<string>();

  useEffect(() => {
    return navigation.addListener('focus', () => {
      setReset(currencyAbbreviation + Math.random());
    });
  }, [navigation]);

  return (
    <SafeAreaView>
      <AmountContainer>
        <View>
          <AmountHeroContainer>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={amount?.length > 8}>
              {amount || 0}
            </AmountText>
            <CurrencySuperScript>
              <CurrencyText>{currencyAbbreviation.toUpperCase()}</CurrencyText>
            </CurrencySuperScript>
          </AmountHeroContainer>
        </View>

        <View>
          <VirtualKeyboard onChange={setAmount} reset={reset} />
          <ActionContainer>
            <Button
              onPress={() => {
                navigation.navigate('Wallet', {
                  screen: 'RequestSpecificAmountQR',
                  params: {wallet, requestAmount: Number(amount)},
                });
              }}
              disabled={!Number(amount)}>
              Continue
            </Button>
          </ActionContainer>
        </View>
      </AmountContainer>
    </SafeAreaView>
  );
};

export default RequestSpecificAmount;
