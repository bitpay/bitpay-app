import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Amount from '../../../components/amount/Amount';
import Button, {ButtonState} from '../../../components/button/Button';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import type {HeaderTitleProps} from '@react-navigation/elements';

const HeaderContainer = styled(HeaderRightContainer)`
  justify-content: center;
`;

const WalletScreenContainer = styled.SafeAreaView<{hasHeaderTitle: boolean}>`
  flex: 1;
  ${hasHeaderTitle => (hasHeaderTitle ? 'margin-top: 30px' : '')}
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
  customAmountSublabel?: any;
  chain?: string;
  tokenAddress?: string;
  context?: string;
  headerTitle?:
    | string
    | ((props: HeaderTitleProps) => React.ReactNode)
    | undefined;
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
    customAmountSublabel,
    chain,
    tokenAddress,
    context,
    headerTitle,
  } = route.params || {};

  const onSendMaxPressed = () => {
    return onAmountSelected?.('', setButtonState, {sendMax: true});
  };
  const onSendMaxPressedRef = useRef(onSendMaxPressed);
  onSendMaxPressedRef.current = onSendMaxPressed;

  useLayoutEffect(() => {
    navigation.setOptions({
      ...(headerTitle && {headerTitle}),
      headerRight: sendMaxEnabled
        ? () => (
            <HeaderContainer>
              <Button
                buttonType="pill"
                buttonStyle="cancel"
                onPress={() => onSendMaxPressedRef.current()}>
                {t('Send Max')}
              </Button>
            </HeaderContainer>
          )
        : undefined,
    });
  }, [navigation, t, sendMaxEnabled, headerTitle]);

  return (
    <WalletScreenContainer hasHeaderTitle={!!headerTitle}>
      <Amount
        buttonState={buttonState}
        context={context}
        cryptoCurrencyAbbreviation={cryptoCurrencyAbbreviation}
        customAmountSublabel={customAmountSublabel}
        fiatCurrencyAbbreviation={fiatCurrencyAbbreviation}
        chain={chain}
        tokenAddress={tokenAddress}
        onSubmit={amt => {
          onAmountSelected?.(amt.toString(), setButtonState);
        }}
      />
    </WalletScreenContainer>
  );
};

export default AmountScreen;
