import React from 'react';
import {HEIGHT} from '../../../components/styled/Containers';
import FastImage, {FastImageProps} from 'react-native-fast-image';

interface OnboardingImageProps extends FastImageProps {
  widthPct?: number;
  heightPct?: number;
}

export const OnboardingImage: React.FC<OnboardingImageProps> = ({
  widthPct,
  heightPct,
  style,
  ...rest
}) => (
  <FastImage
    style={[
      {
        height: HEIGHT * (widthPct ? widthPct : 0.3),
        width: HEIGHT * (heightPct ? heightPct : 0.3),
      },
      style,
    ]}
    {...rest}
  />
);
