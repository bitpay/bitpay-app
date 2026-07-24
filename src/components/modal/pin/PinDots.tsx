import React, {useState} from 'react';
import {Animated, StyleSheet, Vibration, View} from 'react-native';
import {White} from '../../../styles/colors';

interface PinDotsProps {
  pin: Array<string | undefined>;
  pinLength: number;
  shakeDots: boolean;
  setShakeDots: (value: boolean) => void;
}

const styles = StyleSheet.create({
  dotsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginTop: 16,
    marginRight: 'auto' as any,
    marginBottom: 'auto' as any,
    marginLeft: 'auto' as any,
    maxWidth: 145,
    width: '50%',
  },
  dot: {
    height: 18,
    width: 18,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: White,
  },
  dotFilled: {
    backgroundColor: White,
  },
});

const PinDots: React.FC<PinDotsProps> = ({
  pin,
  pinLength,
  shakeDots,
  setShakeDots,
}) => {
  const [animation] = useState(new Animated.Value(0));

  const shake = () => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: -10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShakeDots(false);
      }, 500);
    });
  };

  if (shakeDots) {
    shake();
    Vibration.vibrate();
  }

  return (
    <View style={styles.dotsContainer}>
      {Array.from({length: pinLength}).map((_, index) => {
        const isFilled = index < pin.length;
        return (
          <Animated.View
            style={[
              styles.dot,
              isFilled ? styles.dotFilled : null,
              {transform: [{translateX: animation}]},
            ]}
            key={index}
          />
        );
      })}
    </View>
  );
};

export default PinDots;
