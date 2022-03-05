import React, {useEffect, useLayoutEffect, useState} from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate, White} from '../../../styles/colors';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import SwapButton from '../../../components/swap-button/SwapButton';
import Button, {ButtonState} from '../../../components/button/Button';
import {View} from 'react-native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {formatFiatAmount, sleep} from '../../../utils/helper-methods';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import {ParseAmount} from '../../../store/wallet/effects/amount/amount';

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
  margin-top: 30px;
  align-self: flex-end;
`;

export const AmountHeroContainer = styled.View`
  flex-direction: column;
  align-items: center;
`;

const ActionContainer = styled.View`
  margin: 20px 0;
`;

const Row = styled.View`
  flex-direction: row;
`;

export const AmountText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '35px' : '50px')};
  font-weight: 500;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
`;

export const AmountEquivText = styled(AmountText)`
  font-size: ${({bigAmount}) => (bigAmount ? '12px' : '15px')};
`;

export const CurrencySuperScript = styled.View`
  position: absolute;
  top: 10px;
  right: -20px;
`;

export const CurrencyText = styled(BaseText)`
  font-size: 20px;
  color: ${({theme}) => theme.colors.text};
  position: absolute;
`;

export const AmountContainer = styled.View`
  flex: 1;
  justify-content: space-between;
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

export interface AmountParamList {
  contextHandler: (
    // crypto amount
    amount: string,
    // for toggling sync button 'loading' | 'success' | 'failed' | null | undefined;
    setButtonState: (state: ButtonState) => void,
    opts?: {sendMax: boolean},
  ) => void;
  currencyAbbreviation: string;
  opts?: {
    hideSendMax: boolean;
  };
}

const Amount = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'Amount'>>();
  const {contextHandler, currencyAbbreviation, opts} = route.params;
  const navigation = useNavigation();
  const [buttonState, setButtonState] = useState<ButtonState>();
  // display amount fiat/crypto
  const [displayAmount, setDisplayAmount] = useState('0');
  const [displayEquivalentAmount, setDisplayEquivalentAmount] = useState('0');
  // amount to be sent to proposal creation (sats)
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState(currencyAbbreviation);
  // flag for primary selector type
  const [isFiat, setIsFiat] = useState(false);
  const [rate, setRate] = useState(0);
  const swapList = [currencyAbbreviation, 'USD'];
  const allRates = useAppSelector(({WALLET}) => WALLET.rates);

  useEffect(() => {
    // if added for dev (hot reload)
    if (!isFiat) {
      const fiatRate = allRates[currency.toLowerCase()].find(
        r => r.code === 'USD',
      )!.rate;
      setRate(fiatRate);
    }
  }, []);

  useEffect(() => {
    return navigation.addListener('blur', async () => {
      await sleep(300);
      setButtonState(undefined);
    });
  }, [navigation]);

  const updateAmount = (_val: string) => {
    setDisplayAmount(_val);

    const val = Number(_val);
    if (isNaN(val)) {
      return;
    }

    const cryptoAmount =
      val === 0
        ? '0'
        : ParseAmount(
            isFiat ? val / rate : val,
            currencyAbbreviation.toLowerCase(),
          ).amount;
    const fiatAmount = formatFiatAmount(val * rate, 'USD');

    setDisplayEquivalentAmount(isFiat ? cryptoAmount : fiatAmount);
    setAmount(cryptoAmount);
  };

  useLayoutEffect(() => {
    if (!opts?.hideSendMax) {
      navigation.setOptions({
        headerRight: () => (
          <HeaderContainer>
            <SendMax
              onPress={() =>
                contextHandler(amount, setButtonState, {sendMax: true})
              }>
              <SendMaxText>Send Max</SendMaxText>
            </SendMax>
          </HeaderContainer>
        ),
      });
    }
  });

  return (
    <SafeAreaView>
      <AmountContainer>
        <AmountHeroContainer>
          <Row>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={displayAmount?.length > 8}>
              {displayAmount || 0}
            </AmountText>
            <CurrencySuperScript>
              <CurrencyText>{currency}</CurrencyText>
            </CurrencySuperScript>
          </Row>
          <Row>
            <AmountEquivText>
              {displayEquivalentAmount || 0} {isFiat && currencyAbbreviation}
            </AmountEquivText>
          </Row>
          <SwapButtonContainer>
            <SwapButton
              swapList={swapList}
              onChange={(currency: string) => {
                setCurrency(currency);
                setIsFiat(!isFiat);
              }}
            />
          </SwapButtonContainer>
        </AmountHeroContainer>
        <View>
          <VirtualKeyboard
            onChange={val => updateAmount(val)}
            reset={currency}
          />
          <ActionContainer>
            <Button
              state={buttonState}
              disabled={!+amount}
              onPress={() => contextHandler(amount, setButtonState)}>
              Continue
            </Button>
          </ActionContainer>
        </View>
      </AmountContainer>
    </SafeAreaView>
  );
};

export default Amount;
