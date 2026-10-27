import React, {memo, useState} from 'react';
import {useTheme} from '../../contexts';
import {BaseText} from '../styled/Text';
import {LightBlack, NotificationPrimary, White} from '../../styles/colors';
import haptic from '../haptic-feedback/haptic';
import SwapHorizontal from '../icons/swap-horizontal/SwapHorizontal';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import useAppSelector from '../../utils/hooks/useAppSelector';
import {isNarrowHeight} from '../styled/Containers';

export const SwapButtonContainer: React.FC<
  {isSmallScreen?: boolean} & React.ComponentProps<typeof TouchableOpacity>
> = ({isSmallScreen, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.dark ? LightBlack : '#edf1fe',
          height: isSmallScreen ? 30 : 39,
          paddingVertical: 0,
          paddingHorizontal: 15,
          borderRadius: 19.09,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const ButtonText: React.FC<
  {isSmallScreen?: boolean} & React.ComponentProps<typeof BaseText>
> = ({isSmallScreen, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        {
          marginLeft: 10,
          fontSize: isSmallScreen ? 12 : 18,
          fontWeight: '500',
          color: theme.dark ? White : NotificationPrimary,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export interface SwapButtonProps {
  swapList: Array<string>;
  onChange: (val: string) => void;
}

const SwapButton = ({swapList, onChange}: SwapButtonProps) => {
  const initText = swapList[0];
  const [text, setText] = useState(initText);
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : isNarrowHeight;

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

export default memo(SwapButton);
