import React, {useState} from 'react';
import styled from 'styled-components/native';
import SwapHorizontalSvg from '../../../assets/img/swap-horizontal.svg';
import {BaseText} from '../styled/Text';
import {LightBlack, NotificationPrimary, White} from '../../styles/colors';
import haptic from '../haptic-feedback/haptic';

const SwapButtonContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#edf1fe')};
  flex-grow: 0;
  padding: 10px 20px;
  border-radius: 50px;
`;

const ButtonText = styled(BaseText)`
  margin-left: 10px;
  font-size: 18px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : NotificationPrimary)};
`;

export interface SwapButtonProps {
  swapList: Array<string>;
  onChange: (val: string) => void;
}

const SwapButton = ({swapList, onChange}: SwapButtonProps) => {
  const initText = swapList[0];
  const [text, setText] = useState(initText);

  const swapText = (val: string) => {
    haptic('impactLight');
    const curVal = val === swapList[0] ? swapList[1] : swapList[0];
    setText(curVal);
    onChange(curVal);
  };

  return (
    <SwapButtonContainer onPress={() => swapText(text)}>
      <SwapHorizontalSvg />
      <ButtonText>{text}</ButtonText>
    </SwapButtonContainer>
  );
};

export default SwapButton;
