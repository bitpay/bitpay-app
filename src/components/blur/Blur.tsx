import {BlurView} from '@react-native-community/blur';
import React, {useMemo} from 'react';
import {ViewStyle} from 'react-native';
import {useTheme} from 'styled-components/native';
import {useAppSelector} from '../../utils/hooks';

const blurViewStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export const Blur = React.memo(() => {
  const theme = useTheme();

  const blurType = useMemo(() => (theme.dark ? 'dark' : 'light'), [theme.dark]);

  return (
    <BlurView
      style={blurViewStyle}
      blurType={blurType}
      blurAmount={10}
      reducedTransparencyFallbackColor={theme.colors.background}
    />
  );
});

export const BlurContainer = React.memo(() => {
  const showBlur = useAppSelector(({APP}) => APP.showBlur);
  return showBlur ? <Blur /> : null;
});

export default Blur;
