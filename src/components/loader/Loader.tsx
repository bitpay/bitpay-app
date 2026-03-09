import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleProp, ViewStyle} from 'react-native';
import LoaderSvg from './LoaderSvg';

type LoaderProps = {
  size?: number;
  spinning?: boolean;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
};

const Loader: React.FC<LoaderProps> = ({
  size = 32,
  spinning = true,
  durationMs = 900,
  style,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!spinning) {
      animationRef.current?.stop();
      return;
    }

    spinValue.setValue(0);
    animationRef.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animationRef.current.start();

    return () => {
      animationRef.current?.stop();
    };
  }, [durationMs, spinValue, spinning]);

  const rotation = useMemo(
    () =>
      spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [spinValue],
  );

  return (
    <Animated.View style={[{transform: [{rotate: rotation}]}, style]}>
      <LoaderSvg size={size} />
    </Animated.View>
  );
};

export default Loader;
