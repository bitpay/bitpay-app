import React from 'react';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from 'styled-components/native';

const Blur = () => {
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

export default Blur;
