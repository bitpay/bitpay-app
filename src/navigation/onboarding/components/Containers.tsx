import React from 'react';
import {HEIGHT} from '../../../components/styled/Containers';
import FastImage, {FastImageProps} from 'react-native-fast-image';

interface OnboardingImageProps extends FastImageProps {
  widthPct?: number;
  heightPct?: number;
}

// FastImage defaults to `cover`, which crops any image whose aspect ratio
// differs from its box (the light and dark artwork for a slide share one box
// but are not the same shape). `contain` always shows the whole image.
export const OnboardingImage: React.FC<OnboardingImageProps> = ({
  widthPct,
  heightPct,
  style,
  resizeMode = FastImage.resizeMode.contain,
  ...rest
}) => (
  <FastImage
    resizeMode={resizeMode}
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
