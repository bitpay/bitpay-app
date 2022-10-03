import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Amount from '../../../components/amount/Amount';
import Button, {ButtonState} from '../../../components/button/Button';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import {WalletScreens, WalletStackParamList} from '../WalletStack';

const HeaderContainer = styled(HeaderRightContainer)`
  justify-content: center;
`;

const WalletScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

export interface AmountScreenParamList {
  /**
   * @param amount Crypto amount
   * @param setButtonState Setter to control the Amount component's button UI state.
   * @param opts Optional. Other options relevant to amount selection.
   */
  onAmountSelected: (
    amount: string,
    setButtonState: (state: ButtonState) => void,
    opts?: {sendMax?: boolean},
  ) => void;
  sendMaxEnabled?: boolean;
  cryptoCurrencyAbbreviation?: string;
  fiatCurrencyAbbreviation?: string;
  chain?: string;
  context?: string;
}

const AmountScreen: React.VFC<
  StackScreenProps<WalletStackParamList, WalletScreens.AMOUNT>
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const [buttonState, setButtonState] = useState<ButtonState>();

  const {
    onAmountSelected,
    sendMaxEnabled,
    cryptoCurrencyAbbreviation,
    fiatCurrencyAbbreviation,
    chain,
    context,
  } = route.params || {};

  const onSendMaxPressed = () => {
    return onAmountSelected?.('', setButtonState, {sendMax: true});
  };
  const onSendMaxPressedRef = useRef(onSendMaxPressed);
  onSendMaxPressedRef.current = onSendMaxPressed;

  useLayoutEffect(() => {
    if (sendMaxEnabled) {
      navigation.setOptions({
        headerRight: () => (
          <HeaderContainer>
            <Button
              buttonType="pill"
              buttonStyle="cancel"
              onPress={() => onSendMaxPressedRef.current()}>
              {t('Send Max')}
            </Button>
          </HeaderContainer>
        ),
      });
    }
  }, [navigation, t, sendMaxEnabled]);

  return (
    <WalletScreenContainer>
      <Amount
        buttonState={buttonState}
        context={context}
        cryptoCurrencyAbbreviation={cryptoCurrencyAbbreviation}
        fiatCurrencyAbbreviation={fiatCurrencyAbbreviation}
        chain={chain}
        onSubmit={amt => {
          onAmountSelected?.(amt.toString(), setButtonState);
        }}
      />
    </WalletScreenContainer>
  );
};

export default AmountScreen;
