import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Slate, SlateDark} from '../../../../styles/colors';

const SwapCryptoFiatSwitcherIconSvg: React.FC<{
  isDark: boolean;
  width: number;
  height: number;
}> = ({isDark, width, height}) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none">
      <Path
        d="M8.8401 12.6822V6.55562L6.5401 8.85562L5.6001 7.92223L9.5067 4.01562L13.4135 7.92223L12.4735 8.85562L10.1735 6.55562V12.6822H8.8401ZM14.4935 20.0156L10.5867 16.109L11.5267 15.1756L13.8267 17.4756V11.349H15.1601V17.4756L17.4601 15.1756L18.4001 16.109L14.4935 20.0156Z"
        fill={isDark ? Slate : SlateDark}
      />
    </Svg>
  );
};

const SwapCryptoFiatSwitcherIcon = ({
  width = 24,
  height = 25,
}: {
  width?: number;
  height?: number;
}) => {
  const theme = useTheme();

  return (
    <SwapCryptoFiatSwitcherIconSvg
      isDark={theme.dark}
      width={width}
      height={height}
    />
  );
};

export default SwapCryptoFiatSwitcherIcon;
