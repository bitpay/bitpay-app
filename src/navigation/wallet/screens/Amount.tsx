import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
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
import haptic from '../../../components/haptic-feedback/haptic';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';

const SendMax = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 27.5px;
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

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
`;

const CloseModalButton = styled.TouchableOpacity`
  margin: 15px;
  padding: 5px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
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
  font-size: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : NeutralSlate)};
  padding: 4px 8px;
  border-radius: 15px;
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
  onAmountSelected: (
    // crypto amount
    amount: string,
    // for toggling sync button 'loading' | 'success' | 'failed' | null | undefined;
    setButtonState: (state: ButtonState) => void,
    opts?: {sendMax?: boolean},
  ) => void;
  currencyAbbreviationRouteParam?: string;
  fiatCurrencyAbbreviation?: string;
  opts?: {
    hideSendMax?: boolean;
  };
}

interface AmountProps {
  useAsModal: any;
  currencyAbbreviationProp?: string;
  onDismiss?: (amount?: number) => void;
}

const Amount: React.FC<AmountProps> = ({
  useAsModal,
  currencyAbbreviationProp,
  onDismiss,
}) => {
  const route = useRoute<RouteProp<WalletStackParamList, 'Amount'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  let {
    onAmountSelected,
    currencyAbbreviationRouteParam,
    fiatCurrencyAbbreviation,
    opts,
  } = route.params || {};
  const navigation = useNavigation();
  const theme = useTheme();
  const [buttonState, setButtonState] = useState<ButtonState>();

  const fiatCurrency = fiatCurrencyAbbreviation || defaultAltCurrency.isoCode;

  const cryptoCurrencyAbbreviation = currencyAbbreviationRouteParam
    ? currencyAbbreviationRouteParam
    : currencyAbbreviationProp;

  // flag for primary selector type
  const [rate, setRate] = useState(0);
  const [amountConfig, updateAmountConfig] = useState({
    // display amount fiat/crypto
    displayAmount: '0',
    displayEquivalentAmount: '0',
    // amount to be sent to proposal creation (sats)
    amount: '0',
    currency: cryptoCurrencyAbbreviation
      ? cryptoCurrencyAbbreviation
      : fiatCurrency,
    primaryIsFiat: cryptoCurrencyAbbreviation === fiatCurrency,
  });
  const swapList = cryptoCurrencyAbbreviation
    ? [...new Set([cryptoCurrencyAbbreviation, fiatCurrency])]
    : [fiatCurrency];

  const allRates = useAppSelector(({WALLET}) => WALLET.rates);
  const [curVal, setCurVal] = useState('');

  const {
    displayAmount,
    displayEquivalentAmount,
    amount,
    currency,
    primaryIsFiat,
  } = amountConfig;

  useEffect(() => {
    if (!currency) {
      return;
    }
    updateAmount('0');
    // if added for dev (hot reload)
    if (!primaryIsFiat && allRates[currency.toLowerCase()]) {
      const fiatRate = allRates[currency.toLowerCase()].find(
        r => r.code === fiatCurrency,
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
    updateAmountConfig(current => ({
      ...current,
      displayAmount: _val,
      amount: _val,
    }));

    const val = Number(_val);
    if (isNaN(val) || !cryptoCurrencyAbbreviation) {
      return;
    }

    const cryptoAmount =
      val === 0 || !cryptoCurrencyAbbreviation
        ? '0'
        : ParseAmount(
            primaryIsFiat ? val / rate : val,
            cryptoCurrencyAbbreviation.toLowerCase(),
          ).amount;
    const fiatAmount = formatFiatAmount(val * rate, fiatCurrency);

    updateAmountConfig(current => ({
      ...current,
      displayEquivalentAmount: primaryIsFiat ? cryptoAmount : fiatAmount,
      amount: cryptoAmount,
    }));
  };

  const onSendMaxPressed = () =>
    onAmountSelected
      ? onAmountSelected(amount, setButtonState, {sendMax: true})
      : () => {};
  const onSendMaxPressedRef = useRef(onSendMaxPressed);
  onSendMaxPressedRef.current = onSendMaxPressed;

  useLayoutEffect(() => {
    if (!opts?.hideSendMax && !useAsModal) {
      navigation.setOptions({
        headerRight: () => (
          <HeaderContainer>
            <SendMax onPress={() => onSendMaxPressedRef.current()}>
              <SendMaxText>Send Max</SendMaxText>
            </SendMax>
          </HeaderContainer>
        ),
      });
    }
  }, [opts?.hideSendMax, navigation]);

  const onCellPress = (val: string) => {
    haptic('impactLight');
    let currentValue;
    switch (val) {
      case 'reset':
        currentValue = '';
        break;
      case 'backspace':
        currentValue = curVal.slice(0, -1);
        break;
      case '.':
        currentValue = curVal.includes('.') ? curVal : curVal + val;
        break;
      default:
        currentValue = curVal + val;
    }
    setCurVal(currentValue);
    updateAmount(currentValue);
  };

  return (
    <SafeAreaView>
      {useAsModal && (
        <ModalHeader>
          <CloseModalButton
            onPress={() => {
              if (onDismiss) {
                onDismiss();
              }
            }}>
            <CloseModal
              {...{
                width: 20,
                height: 20,
                color: theme.dark ? 'white' : 'black',
              }}
            />
          </CloseModalButton>
        </ModalHeader>
      )}
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
              <CurrencyText>{currency || 'USD'}</CurrencyText>
            </CurrencySuperScript>
          </Row>
          {cryptoCurrencyAbbreviation ? (
            <Row>
              <AmountEquivText>
                {displayEquivalentAmount || 0}{' '}
                {primaryIsFiat && cryptoCurrencyAbbreviation}
              </AmountEquivText>
            </Row>
          ) : null}
          {swapList.length > 1 ? (
            <SwapButtonContainer>
              <SwapButton
                swapList={swapList}
                onChange={(currency: string) => {
                  setCurVal('');
                  updateAmountConfig(current => ({
                    ...current,
                    currency,
                    primaryIsFiat: !primaryIsFiat,
                    displayAmount: '0',
                    displayEquivalentAmount: primaryIsFiat
                      ? formatFiatAmount(0, fiatCurrency)
                      : '0',
                  }));
                }}
              />
            </SwapButtonContainer>
          ) : null}
        </AmountHeroContainer>
        <View>
          <VirtualKeyboard onCellPress={onCellPress} />
          <ActionContainer>
            <Button
              state={buttonState}
              disabled={!+amount}
              onPress={() => {
                if (useAsModal && onDismiss) {
                  onDismiss(Number(amount));
                  return;
                }
                if (onAmountSelected) {
                  onAmountSelected(amount, setButtonState);
                }
              }}>
              Continue
            </Button>
          </ActionContainer>
        </View>
      </AmountContainer>
    </SafeAreaView>
  );
};

export default Amount;
