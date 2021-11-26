import React, {ReactNode} from 'react';
import styled from 'styled-components/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {Action, NeutralSlate, White} from '../../../../styles/colors';
import BuySvg from '../../../../../assets/img/home/linking-buttons/buy.svg';
import ReceiveSvg from '../../../../../assets/img/home/linking-buttons/receive.svg';
import SendSvg from '../../../../../assets/img/home/linking-buttons/send.svg';
import SwapSvg from '../../../../../assets/img/home/linking-buttons/swap.svg';
import Haptic from '../../../../components/haptic-feedback/haptic';
import {ColorSchemeName} from 'react-native';

const ButtonsRow = styled.View`
  width: 100%;
  justify-content: space-evenly;
  flex-direction: row;
`;

const ButtonContainer = styled.View`
  align-items: center;
`;

const ButtonText = styled.Text<{theme: ColorSchemeName}>`
  font-size: 12px;
  line-height: 18px;
  color: ${({theme}: {theme: ColorSchemeName}) =>
    theme === 'light' ? Action : White};
  margin-top: 5px;
`;

const LinkButton = styled.TouchableOpacity<{theme: ColorSchemeName}>`
  height: 43px;
  width: 43px;
  border-radius: 11px;
  align-items: center;
  justify-content: center;
  background: ${({theme}: {theme: ColorSchemeName}) =>
    theme === 'light' ? NeutralSlate : '#0C204E'};
`;

const LinkingButtons = () => {
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  const _onPress = (cta: () => void) => {
    Haptic('impactLight');
    cta();
  };
  const buttonsList: Array<{label: string; img: ReactNode; cta: () => void}> = [
    // TODO: update icons
    {
      label: 'buy',
      img: <BuySvg />,
      cta: () => {
        /** TODO: Redirect me*/
      },
    },
    {
      label: 'swap',
      img: <SwapSvg />,
      cta: () => {
        /** TODO: Redirect me*/
      },
    },
    {
      label: 'receive',
      img: <ReceiveSvg />,
      cta: () => {
        /** TODO: Redirect me*/
      },
    },
    {
      label: 'send',
      img: <SendSvg />,
      cta: () => {
        /** TODO: Redirect me*/
      },
    },
  ];
  return (
    <ButtonsRow>
      {buttonsList.map(button => (
        <ButtonContainer>
          <LinkButton theme={colorScheme} onPress={() => _onPress(button.cta)}>
            {button.img}
          </LinkButton>
          <ButtonText theme={colorScheme}>
            {button.label.toUpperCase()}
          </ButtonText>
        </ButtonContainer>
      ))}
    </ButtonsRow>
  );
};

export default LinkingButtons;
