import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../contexts';
import {SlateDark, White} from '../../styles/colors';
import MultisigIcon from '../../../assets/img/icon-multisig-group.svg';
import WalletTypeBadge, {
  WalletTypeBadgeSize,
} from '../wallet-type-badge/WalletTypeBadge';

interface Props {
  size?: WalletTypeBadgeSize;
  style?: StyleProp<ViewStyle>;
}

const MultisigBadge: React.FC<Props> = ({size = 'list', style}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const iconSize = size === 'card' ? 20 : 16;

  return (
    <WalletTypeBadge
      size={size}
      style={style}
      icon={
        <MultisigIcon
          width={iconSize}
          height={iconSize}
          color={theme.dark ? White : SlateDark}
        />
      }
      label={t('Multisig')}
    />
  );
};

export default MultisigBadge;
