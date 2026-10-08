import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../../contexts';
import {CharcoalBlack, Air} from '../../styles/colors';

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

const FloatingTabBarBackground = () => {
  const {dark} = useTheme();
  const isIOS = Platform.OS === 'ios';
  const tint = dark
    ? `${CharcoalBlack}${isIOS ? '40' : 'F0'}`
    : `${Air}${isIOS ? '8C' : 'F0'}`;

  return (
    <>
      {isIOS ? (
        <BlurView
          style={styles.fill}
          blurType={dark ? 'dark' : 'light'}
          blurAmount={20}
          reducedTransparencyFallbackColor={dark ? CharcoalBlack : Air}
        />
      ) : null}
      <View style={[styles.fill, {backgroundColor: tint}]} />
    </>
  );
};

export default FloatingTabBarBackground;
