import React from 'react';
import {StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  TouchableOpacity,
  type TouchableOpacityProps,
} from '../base/TouchableOpacity';
import {ActiveOpacity} from '../styled/Containers';

const balanceVisibilityHitSlop = {
  top: 8,
  bottom: 8,
  left: 16,
  right: 16,
} as const;

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: 160,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type BalanceVisibilityButtonProps = Omit<
  TouchableOpacityProps,
  'onLongPress' | 'onPress'
> & {
  hidden: boolean;
  onToggle: () => void;
};

const BalanceVisibilityButton: React.FC<BalanceVisibilityButtonProps> = ({
  hidden,
  onToggle,
  accessibilityLabel,
  activeOpacity = ActiveOpacity,
  hitSlop = balanceVisibilityHitSlop,
  style,
  touchableLibrary = 'react-native',
  ...props
}) => {
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      {...props}
      accessibilityLabel={
        accessibilityLabel ?? (hidden ? t('Show balances') : t('Hide balances'))
      }
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      hitSlop={hitSlop}
      onPress={onToggle}
      style={[styles.touchTarget, style]}
      touchableLibrary={touchableLibrary}
    />
  );
};

export default BalanceVisibilityButton;
