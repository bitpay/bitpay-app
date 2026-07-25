import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Warning, Warning25} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import WalletTypeBadge, {
  WalletTypeBadgeSize,
} from '../wallet-type-badge/WalletTypeBadge';

interface Props {
  m: number;
  n: number;
  size?: WalletTypeBadgeSize;
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  betaBadge: {
    backgroundColor: Warning25,
    borderRadius: 100,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  betaBadgeText: {
    color: Warning,
    fontSize: 10,
    lineHeight: 13,
  },
});

const ThresholdBadge: React.FC<Props> = ({m, n, size = 'list', style}) => {
  const {t} = useTranslation();

  return (
    <WalletTypeBadge
      size={size}
      style={style}
      icon={
        <View style={styles.betaBadge}>
          <BaseText style={styles.betaBadgeText}>{t('Beta')}</BaseText>
        </View>
      }
      label={`${t('Threshold')} ${m}/${n}`}
    />
  );
};

export default ThresholdBadge;
