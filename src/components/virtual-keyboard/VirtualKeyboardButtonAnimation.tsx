import React, {memo, useCallback, useRef} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {getKeyboardSizes, KeyboardSizesContext} from './VirtualKeyboard';

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.6,
  },
});

interface RippleProps {
  onPress: () => void;
  backgroundColor?: string;
  onLongPress?: () => void;
  isSmallScreen?: boolean;
  context?: KeyboardSizesContext;
  children: React.ReactNode;
}

const VirtualKeyboardButtonAnimation: React.FC<RippleProps> = ({
  onPress,
  backgroundColor,
  onLongPress,
  isSmallScreen,
  context,
  children,
}) => {
  const didLongPress = useRef(false);
  const virtualKeyboardButtonSize = getKeyboardSizes(
    isSmallScreen,
    context,
  ).virtualKeyboardButtonSize;
  const handlePressIn = useCallback(() => {
    didLongPress.current = false;
  }, []);
  const handleLongPress = useCallback(() => {
    didLongPress.current = true;
    (onLongPress || onPress)();
  }, [onLongPress, onPress]);
  const handlePress = useCallback(() => {
    if (!didLongPress.current) {
      onPress();
    }
  }, [onPress]);

  return (
    <Pressable
      android_ripple={{color: backgroundColor, borderless: true}}
      delayLongPress={1000}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={({pressed}) => [
        styles.button,
        {
          height: virtualKeyboardButtonSize,
          width: virtualKeyboardButtonSize,
        },
        Platform.OS !== 'android' && pressed && styles.pressed,
      ]}>
      <View>{children}</View>
    </Pressable>
  );
};

export default memo(VirtualKeyboardButtonAnimation);
