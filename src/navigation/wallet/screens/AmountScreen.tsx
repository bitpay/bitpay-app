import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Amount from '../../../components/amount/Amount';
import Button, {ButtonState} from '../../../components/button/Button';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import type {HeaderTitleProps} from '@react-navigation/elements';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {Wallet} from '../../../store/wallet/wallet.models';
import {IsUtxoChain} from '../../../store/wallet/utils/currency';
import OptionsSheet, {
  Option,
} from '../../../navigation/wallet/components/OptionsSheet';
import WalletIcons from '../../../navigation/wallet/components/WalletIcons';
import Settings from '../../../components/settings/Settings';
import {sleep} from '../../../utils/helper-methods';
import {useAppSelector} from '../../../utils/hooks';

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
  wallet?: Wallet;
  sendTo?: {
    name: string | undefined;
    type: string;
    address: string;
    destinationTag: number | undefined;
  };
}

const AmountModalContainerHOC = gestureHandlerRootHOC(props => {
  return <>{props.children}</>;
});

const AmountScreen: React.FC<
  NativeStackScreenProps<WalletGroupParamList, WalletScreens.AMOUNT>
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const {
    wallet,
    sendTo,
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

  const getHeaderRight = () => (
    <HeaderContainer style={{flexDirection: 'row'}}>
      <Button
        buttonType="pill"
        buttonStyle="cancel"
        onPress={() => onSendMaxPressedRef.current()}
        style={{marginRight: chain && IsUtxoChain(chain) && wallet ? 10 : 0}}>
        {t('Send Max')}
      </Button>
      {chain && IsUtxoChain(chain) && wallet && sendTo?.address && (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      )}
    </HeaderContainer>
  );

  const assetOptions: Array<Option> =
    chain && IsUtxoChain(chain) && wallet && sendTo?.address
      ? [
          {
            img: <WalletIcons.SelectInputs />,
            title: t('Select Inputs for this Transaction'),
            description: t(
              "Choose which inputs you'd like to use to send crypto.",
            ),
            onPress: async () => {
              await sleep(500);
              navigation.navigate('SendToOptions', {
                title: t('Select Inputs'),
                wallet,
                sendTo,
                context: 'selectInputs',
              });
            },
          },
        ]
      : [];

  useLayoutEffect(() => {
    navigation.setOptions({
      ...(headerTitle && {headerTitle}),
      headerRight: sendMaxEnabled ? getHeaderRight : undefined,
    });
  }, [navigation, t, sendMaxEnabled, headerTitle]);

  return (
    <AmountModalContainerHOC>
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
        <OptionsSheet
          isVisible={showWalletOptions}
          closeModal={() => setShowWalletOptions(false)}
          options={assetOptions}
        />
      </WalletScreenContainer>
    </AmountModalContainerHOC>
  );
};

export default AmountScreen;
