import React from 'react';
import Svg, {Path} from 'react-native-svg';
import {useTheme} from '@react-navigation/native';
import {Slate, SlateDark} from '../../../../styles/colors';

interface MarketingCloseIconProps {
  color?: string;
}

const MarketingCloseIcon: React.FC<MarketingCloseIconProps> = ({color}) => {
  const {dark} = useTheme();
  const fillColor = color ?? (dark ? Slate : SlateDark);

  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M1.05375 13.3075L0 12.2538L5.6 6.65375L0 1.05375L1.05375 0L6.65375 5.6L12.2537 0L13.3075 1.05375L7.7075 6.65375L13.3075 12.2538L12.2537 13.3075L6.65375 7.7075L1.05375 13.3075Z"
        fill={fillColor}
      />
    </Svg>
  );
};

export default MarketingCloseIcon;
