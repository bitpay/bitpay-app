import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../../contexts';
import {CharcoalBlack, Air, White} from '../../styles/colors';
import {changeOpacity} from '../../utils/helper-methods';

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
            backgroundColor: changeOpacity(
              dark ? CharcoalBlack : White,
              dark ? 0.25 : 0.3,
            ),
          },
        ]}
      />
    </>
  );
};

export default FloatingTabBarBackground;
