import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import styled from 'styled-components/native';
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

const BetaBadge = styled.View`
  background-color: ${Warning25};
  border-radius: 100px;
  padding: 2px 4px;
`;

const BetaBadgeText = styled(BaseText)`
  color: ${Warning};
  font-size: 10px;
  line-height: 13px;
`;

const ThresholdBadge: React.FC<Props> = ({m, n, size = 'list', style}) => {
  const {t} = useTranslation();

  return (
    <WalletTypeBadge
      size={size}
      style={style}
      icon={
        <BetaBadge>
          <BetaBadgeText>{t('Beta')}</BetaBadgeText>
        </BetaBadge>
      }
      label={`${t('Threshold')} ${m}/${n}`}
    />
  );
};

export default ThresholdBadge;
