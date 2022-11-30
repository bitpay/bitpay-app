import {BlurView} from '@react-native-community/blur';
import React from 'react';
import {useTheme} from 'styled-components/native';
import {useAppSelector} from '../../utils/hooks';

export const Blur = () => {
  const theme = useTheme();

  return (
    <BlurView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      blurType={theme.dark ? 'dark' : 'light'}
      blurAmount={10}
      reducedTransparencyFallbackColor="white"
    />
  );
};

export const BlurContainer = () => {
  const showBlur = useAppSelector(({APP}) => APP.showBlur);

  return showBlur ? <Blur /> : null;
};

export default Blur;
