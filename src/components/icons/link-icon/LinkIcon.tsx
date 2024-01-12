import React from 'react';
import {useTheme} from '@react-navigation/native';
import {Svg, Path} from 'react-native-svg';
import {BitPayTheme} from '../../../themes/bitpay';

const LinksSvg: React.FC<{color: string}> = ({color}) => {
  return (
    <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <Path
        d="M12.5 12.5H3C2.60218 12.5 2.22064 12.342 1.93934 12.0607C1.65804 11.7794 1.5 11.3978 1.5 11V1.5"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M7.5 1.5H12.5V6.5"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Path
        d="M12.5 1.5L6.5 7.5"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
};

const LinkIcon = () => {
  const theme = useTheme() as BitPayTheme;

  return <LinksSvg color={theme.colors.link} />;
};

export default LinkIcon;
