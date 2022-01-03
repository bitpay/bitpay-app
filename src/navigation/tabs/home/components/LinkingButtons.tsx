import React, {ReactNode} from 'react';
import styled from 'styled-components/native';
import {Action, NeutralSlate, White} from '../../../../styles/colors';
import BuySvg from '../../../../../assets/img/home/linking-buttons/buy.svg';
import ReceiveSvg from '../../../../../assets/img/home/linking-buttons/receive.svg';
import SendSvg from '../../../../../assets/img/home/linking-buttons/send.svg';
import SwapSvg from '../../../../../assets/img/home/linking-buttons/swap.svg';
import Haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText} from '../../../../components/styled/Text';
import {useTheme} from '@react-navigation/native';
import {navigationRef} from '../../../../Root';

const ButtonsRow = styled.View`
  width: 100%;
  justify-content: space-evenly;
  flex-direction: row;
`;

const ButtonContainer = styled.View`
  align-items: center;
  margin: 20px 0;
`;

const ButtonText = styled(BaseText)<{isDark: boolean}>`
  font-size: 12px;
  line-height: 18px;
  color: ${({isDark}) => (isDark ? White : Action)};
  margin-top: 5px;
`;

const LinkButton = styled.TouchableOpacity<{isDark: boolean}>`
  height: 43px;
  width: 43px;
  border-radius: 11px;
  align-items: center;
  justify-content: center;
  background: ${({isDark}) => (isDark ? '#0C204E' : NeutralSlate)};
  margin: 10px 0;
`;

interface ButtonListProps {
  label: string;
  img: ReactNode;
  cta: () => void;
}

interface Props {
  receiveCta: () => void;
  sendCta: () => void;
}

const LinkingButtons = ({receiveCta, sendCta}: Props) => {
  const theme = useTheme();
  const buttonsList: Array<ButtonListProps> = [
    // TODO: update icons
    {
      label: 'buy',
      img: <BuySvg />,
      cta: () => {
        navigationRef.navigate('BuyCrypto', {screen: 'Root'});
      },
    },
    {
      label: 'swap',
      img: <SwapSvg />,
      cta: () => {
        navigationRef.navigate('SwapCrypto', {screen: 'Root'});
      },
    },
    {
      label: 'receive',
      img: <ReceiveSvg />,
      cta: receiveCta,
    },
    {
      label: 'send',
      img: <SendSvg />,
      cta: sendCta,
    },
  ];
  return (
    <ButtonsRow>
      {buttonsList.map(({label, cta, img}: ButtonListProps) => (
        <ButtonContainer key={label}>
          <LinkButton
            isDark={theme.dark}
            onPress={() => {
              Haptic('impactLight');
              cta();
            }}>
            {img}
          </LinkButton>
          <ButtonText isDark={theme.dark}>{label.toUpperCase()}</ButtonText>
        </ButtonContainer>
      ))}
    </ButtonsRow>
  );
};

export default LinkingButtons;
