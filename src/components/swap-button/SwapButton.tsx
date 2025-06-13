import React, {useState} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {LightBlack, NotificationPrimary, White} from '../../styles/colors';
import haptic from '../haptic-feedback/haptic';
import SwapHorizontal from '../icons/swap-horizontal/SwapHorizontal';
import {TouchableOpacity} from 'react-native-gesture-handler';
import useAppSelector from '../../utils/hooks/useAppSelector';
import {HEIGHT} from '../styled/Containers';

export const SwapButtonContainer = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#edf1fe')};
  height: ${({isSmallScreen}) => (isSmallScreen ? 30 : 39)}px;
  padding: 0 15px;
  border-radius: 19.09px;
`;

export const ButtonText = styled(BaseText)<{isSmallScreen?: boolean}>`
  margin-left: 10px;
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 12 : 18)}px;
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
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;

  const swapText = (val: string) => {
    if (swapList.length === 1) {
      return;
    }
    haptic('impactLight');
    const curVal = val === swapList[0] ? swapList[1] : swapList[0];
    setText(curVal);
    onChange(curVal);
  };

  return (
    <SwapButtonContainer
      isSmallScreen={_isSmallScreen}
      onPress={() => swapText(text)}>
      <SwapHorizontal />
      <ButtonText isSmallScreen={_isSmallScreen}>{text}</ButtonText>
    </SwapButtonContainer>
  );
};

export default SwapButton;
