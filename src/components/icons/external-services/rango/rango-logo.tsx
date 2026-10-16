import React from 'react';
import {Circle, Path, Svg} from 'react-native-svg';
import {useTheme} from '../../../../contexts';

/**
 * Rango Exchange mark. Rango's brand mark is a rounded "R" glyph; the wordmark
 * is omitted here because every call site in the swap flow renders icon-only.
 */
const RangoIconSvg: React.FC<{
  isDark: boolean;
  width: number;
  height: number;
}> = ({isDark, width, height}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="32" fill={isDark ? '#1C1C28' : '#0E0E1A'} />
      <Path
        fill="#FF4D4D"
        d="M22 17h14.5c6.9 0 12.1 4.6 12.1 11.3 0 4.8-2.7 8.6-7 10.4L50 47h-9.6l-7.2-7.6h-2.6V47H22V17Zm8.6 7v8.7h5.3c2.7 0 4.5-1.7 4.5-4.3 0-2.6-1.8-4.4-4.5-4.4h-5.3Z"
      />
    </Svg>
  );
};

interface RangoLogoProps {
  iconOnly?: boolean;
  width?: number;
  height?: number;
}

const RangoLogo: React.FC<RangoLogoProps> = ({width = 100, height = 40}) => {
  const theme = useTheme();
  return <RangoIconSvg isDark={theme.dark} width={width} height={height} />;
};

export default RangoLogo;
