import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {type AccessibilityState} from 'react-native';
import * as Svg from 'react-native-svg';
import {
  CharcoalBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';

const CircleButton = styled(TouchableOpacity)<{
  $borderColor: string;
  $isActive: boolean;
  $activeBackgroundColor: string;
}>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border-width: 1px;
  border-color: ${({$borderColor}) => $borderColor};
  background-color: ${({$isActive, $activeBackgroundColor}) =>
    $isActive ? $activeBackgroundColor : 'transparent'};
  align-items: center;
  justify-content: center;
`;

const CollapseContentButtonIcon = ({fill}: {fill: string}) => {
  return (
    <Svg.Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Svg.Path d="M11 13V19H9V15H5V13H11ZM15 5V9H19V11H13V5H15Z" fill={fill} />
    </Svg.Svg>
  );
};

type Props = {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isActive?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
};

const CollapseContentButton: React.FC<Props> = ({
  onPress,
  onPressIn,
  onPressOut,
  isActive = false,
  accessibilityLabel,
  accessibilityState,
}) => {
  const theme = useTheme();
  const borderColor = theme.dark ? SlateDark : Slate30;
  const iconFill = theme.dark ? White : CharcoalBlack;
  const activeBackgroundColor = theme.dark ? CharcoalBlack : NeutralSlate;

  return (
    <CircleButton
      $borderColor={borderColor}
      $isActive={isActive}
      $activeBackgroundColor={activeBackgroundColor}
      touchableLibrary="react-native"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={{top: 16, bottom: 16, left: 16, right: 16}}>
      <CollapseContentButtonIcon fill={iconFill} />
    </CircleButton>
  );
};

export default CollapseContentButton;
