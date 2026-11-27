import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BaseText} from '../styled/Text';
import {useBackupColors} from './colors';
import {OfflineGlyph} from './glyphs';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import SuccessIcon from '../../../assets/img/success.svg';

export type TopToastKind = 'busy' | 'ok' | 'offline';

export interface TopToastMessage {
  text: string;
  kind?: TopToastKind;
  durationMs?: number;
}

export const showTopToast = (toast: TopToastMessage | null) =>
  DeviceEventEmitter.emit(DeviceEmitterEvents.TOP_TOAST, toast);

const HIDDEN_OFFSET = -110;

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  text: {fontSize: 13, lineHeight: 18, flexShrink: 1},
});

export const TopToast = () => {
  const colors = useBackupColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<TopToastMessage | null>(null);
  const offset = useSharedValue(HIDDEN_OFFSET);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.TOP_TOAST,
      (next: TopToastMessage | null) => {
        clearTimeout(timer);
        if (next) {
          setToast(next);
        }
        offset.set(withTiming(next ? 0 : HIDDEN_OFFSET, {duration: 300}));
        if (next?.durationMs) {
          timer = setTimeout(
            () => offset.set(withTiming(HIDDEN_OFFSET, {duration: 300})),
            next.durationMs,
          );
        }
      },
    );
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateY: offset.get()}],
  }));

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          top: insets.top + 4,
          backgroundColor: colors.surfaceCard,
          borderColor: colors.borderCard,
        },
        animatedStyle,
      ]}>
      {toast.kind === 'busy' ? (
        <ActivityIndicator size="small" color={colors.textSubtle} />
      ) : null}
      {toast.kind === 'ok' ? <SuccessIcon width={16} height={16} /> : null}
      {toast.kind === 'offline' ? (
        <OfflineGlyph color={colors.textSubtle} />
      ) : null}
      <View>
        <BaseText style={styles.text}>{toast.text}</BaseText>
      </View>
    </Animated.View>
  );
};
