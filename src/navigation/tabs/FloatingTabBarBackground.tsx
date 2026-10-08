import React from 'react';
import {StyleSheet, View} from 'react-native';
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

  return (
    <>
      <BlurView
        style={styles.fill}
        blurType={dark ? 'dark' : 'light'}
        blurAmount={20}
        reducedTransparencyFallbackColor={dark ? CharcoalBlack : Air}
      />
      <View
        style={[
          styles.fill,
          {
            backgroundColor: `${dark ? CharcoalBlack : Air}${
              dark ? '40' : '8C'
            }`,
          },
        ]}
      />
    </>
  );
};

export default FloatingTabBarBackground;
