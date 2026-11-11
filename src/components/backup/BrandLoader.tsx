import React, {useEffect} from 'react';
import {Dimensions, Platform, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import {BaseText} from '../styled/Text';
import BaseModal from '../modal/base/BaseModal';
import {useBackupColors} from './colors';
import {Action} from '../../styles/colors';
import BitPayB from '../../../assets/img/logos/bitpay-b.svg';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get(
  Platform.OS === 'android' ? 'screen' : 'window',
);

const SIZE = 96;
const INSET = SIZE * 0.14;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const styles = StyleSheet.create({
  fill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  center: {alignItems: 'center', justifyContent: 'center'},
  loader: {width: SIZE, height: SIZE},
  disc: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    right: INSET,
    bottom: INSET,
    borderRadius: SIZE,
    overflow: 'hidden',
  },
  logo: {marginLeft: -SIZE * 0.02},
  busy: {
    flex: 1,
    margin: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 40,
  },
  busyText: {fontSize: 16, lineHeight: 25, textAlign: 'center'},
  modal: {margin: 0},
});

const BrandLoader = () => {
  const colors = useBackupColors();
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.set(
      withRepeat(
        withTiming(360, {duration: 1000, easing: Easing.linear}),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);
  const arcStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.get()}deg`}],
  }));
  return (
    <View style={styles.loader} importantForAccessibility="no-hide-descendants">
      <Svg width={SIZE} height={SIZE} viewBox="0 0 96 96" style={styles.fill}>
        <Circle
          cx="48"
          cy="48"
          r={RADIUS}
          fill="none"
          stroke={colors.borderCard}
          strokeWidth="4"
        />
      </Svg>
      <Animated.View style={[styles.fill, arcStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 96 96">
          <Circle
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke={Action}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.22} ${CIRCUMFERENCE}`}
          />
        </Svg>
      </Animated.View>
      <View style={[styles.center, styles.disc]}>
        <Svg style={styles.fill} viewBox="0 0 10 10" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="brandDisc" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#121E58" />
              <Stop offset="1" stopColor="#1C2D8C" />
            </LinearGradient>
          </Defs>
          <Circle cx="5" cy="5" r="5" fill="url(#brandDisc)" />
        </Svg>
        <BitPayB
          width={SIZE * 0.25}
          height={SIZE * 0.375}
          style={styles.logo}
        />
      </View>
    </View>
  );
};

export const BusyOverlay = ({
  visible,
  text,
}: {
  visible: boolean;
  text: string;
}) => {
  const colors = useBackupColors();
  return (
    <BaseModal
      id="backupBusy"
      isVisible={visible}
      deviceHeight={SCREEN_HEIGHT}
      deviceWidth={SCREEN_WIDTH}
      coverScreen={true}
      statusBarTranslucent={true}
      hasBackdrop={false}
      animationIn="fadeIn"
      animationOut="fadeOut"
      hideModalContentWhileAnimating={true}
      useNativeDriver={true}
      style={styles.modal}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={text}
        style={[styles.busy, {backgroundColor: colors.screenBg}]}>
        <BrandLoader />
        <BaseText style={[styles.busyText, {color: colors.textDescription}]}>
          {text}
        </BaseText>
      </View>
    </BaseModal>
  );
};
