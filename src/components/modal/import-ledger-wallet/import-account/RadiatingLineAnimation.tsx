import React, {useEffect} from 'react';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {IconRow} from '../../import-ledger-wallet/import-ledger-wallet.styled';
import {SvgProps} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import RadiatingCircleWhite from '../../../../../assets/img/radiating-circle-white.svg';
import RadiatingCircleBlack from '../../../../../assets/img/radiating-circle-black.svg';

interface RadiatingLineAnimationProps {
  icon: React.FC<SvgProps>;
  height: number;
  width: number;
}

const Ring = ({delay, delaysLength}: {delay: number; delaysLength: number}) => {
  const ring = useSharedValue(0);
  const theme = useTheme();
  const ringstyle = useAnimatedStyle(() => ({
    opacity: 1 - ring.value,
    transform: [
      // @ts-ignore
      {
        scale: interpolate(ring.value, [0, 1], [0, 3]),
      },
    ],
  }));
  useEffect(() => {
    ring.value = withDelay(
      delay,
      withRepeat(withTiming(1, {duration: delaysLength * 1000}), -1),
    );
  }, []);
  return (
    <Animated.View
      style={[
        {
          zIndex: -1,
          position: 'absolute',
          top: -20,
        },
        ringstyle,
      ]}>
      {theme.dark ? (
        <RadiatingCircleBlack width={100} height={100} />
      ) : (
        <RadiatingCircleWhite width={100} height={100} />
      )}
    </Animated.View>
  );
};

const RadiatingLineAnimation: React.FC<RadiatingLineAnimationProps> = ({
  icon,
  height,
  width,
}) => {
  const delays = [0, 1000, 2000, 3000];
  return (
    <IconRow>
      {icon({height, width})}
      {delays.map((delay, idx) => (
        <Ring key={idx} delay={delay} delaysLength={delays.length} />
      ))}
    </IconRow>
  );
};

export default RadiatingLineAnimation;
