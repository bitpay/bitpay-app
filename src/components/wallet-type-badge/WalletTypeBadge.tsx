import React, {ReactNode} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../../contexts';
import {BaseText} from '../styled/Text';
import {LightBlack, Slate30, SlateDark} from '../../styles/colors';

export type WalletTypeBadgeSize = 'list' | 'card';

interface Props {
  icon: ReactNode;
  label: string;
  size?: WalletTypeBadgeSize;
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  label: {
    fontStyle: 'normal',
    fontWeight: '400',
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 20,
  },
  listLabel: {
    fontSize: 12,
    lineHeight: 15,
  },
});

const WalletTypeBadge: React.FC<Props> = ({
  icon,
  label,
  size = 'list',
  style,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}>
      {icon}
      <BaseText
        style={[
          styles.label,
          size === 'card' ? styles.cardLabel : styles.listLabel,
          {color: theme.dark ? Slate30 : SlateDark},
        ]}>
        {label}
      </BaseText>
    </View>
  );
};

export default WalletTypeBadge;
