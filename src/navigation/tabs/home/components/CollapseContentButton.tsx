import React from 'react';
import {useTheme} from '../../../../contexts';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {StyleSheet, type AccessibilityState} from 'react-native';
import * as Svg from 'react-native-svg';
import {
  CharcoalBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';

const styles = StyleSheet.create({
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const CircleButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {
    $borderColor: string;
    $isActive: boolean;
    $activeBackgroundColor: string;
  }
> = ({$borderColor, $isActive, $activeBackgroundColor, style, ...rest}) => (
  <TouchableOpacity
    style={[
      styles.circleButton,
      {
        borderColor: $borderColor,
        backgroundColor: $isActive ? $activeBackgroundColor : 'transparent',
      },
      style,
    ]}
    {...rest}
  />
);

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
