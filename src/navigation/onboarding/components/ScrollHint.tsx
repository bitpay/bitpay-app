import React from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../contexts';

interface ScrollHintProps {
  height: number;
  offset?: number;
}

const styles = StyleSheet.create({
  scrollHintContainer: {
    bottom: 0,
    position: 'absolute',
    width: '100%',
  },
  gradient: {
    width: '100%',
  },
});

export const ScrollHintContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.scrollHintContainer, style]} {...rest} />
));
ScrollHintContainer.displayName = 'ScrollHintContainer';

const ScrollHint: React.FC<ScrollHintProps> = props => {
  const {height, offset = 0.25} = props;
  const theme = useTheme();
  const backgroundColor = theme.colors.background;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`${backgroundColor}00`, backgroundColor]}
      locations={[0, offset]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={[styles.gradient, {height}]}
    />
  );
};

export default React.memo(ScrollHint);
