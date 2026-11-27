import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ModalBottomSheet,
  ModalDetent,
} from '@swmansion/react-native-bottom-sheet';
import {useTheme} from '../../../../contexts';
import {useTranslation} from 'react-i18next';
import {ThemeContext as NavigationThemeContext} from '@react-navigation/native';
import {BlurContainer} from '../../../blur/Blur';
import {HEIGHT, SheetParams} from '../../../styled/Containers';
import BaseModal from '../BaseModal';
import {useLatestCallback} from '../../../../utils/hooks/useLatestCallback';
import {Black, Overlay, White} from '../../../../styles/colors';

interface Props extends SheetParams {
  isVisible: boolean;
  fullscreen?: boolean;
  enableBackdropDismiss?: boolean;
  onBackdropPress: (props?: any) => void;
  onModalHide?: () => void;
  children?: any;
  modalLibrary?: 'bottom-sheet' | 'modal';
  backdropOpacity?: number;
  backgroundColor?: string;
  borderRadius?: number;
  disableAnimations?: boolean;
  height?: number;
  paddingTop?: number;
  snapPoints?: string[];
}

type SheetModalProps = React.PropsWithChildren<Props>;

const DEFAULT_BACKDROP_OPACITY = 0.5;
const MODAL_LAYOUT_BACKDROP_OPACITY = 0.4;
const MODAL_LAYOUT_SETTLE_DURATION = 300;
const HIDE_FALLBACK_DELAY = 1000;
const MODAL_LAYOUT_DETENTS: ModalDetent[] = [
  {value: 0, programmatic: true},
  '100%',
];

let openModalLayoutSheets = 0;

export const isModalLayoutSheetOpen = () => openModalLayoutSheets > 0;

const styles = StyleSheet.create({
  modalLayout: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

const SheetModal: React.FC<SheetModalProps> = ({
  children,
  isVisible,
  fullscreen,
  enableBackdropDismiss,
  onBackdropPress,
  onModalHide,
  placement,
  modalLibrary = 'modal',
  backdropOpacity,
  backgroundColor,
  borderRadius,
  disableAnimations = false,
  height,
  paddingTop,
  snapPoints,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;
  const theme = useTheme();
  const {t} = useTranslation();

  const desiredVisibleRef = useRef(isVisible);
  desiredVisibleRef.current = isVisible;
  const notifyModalHide = useLatestCallback(() => onModalHide?.());
  const hasPendingHideRef = useRef(isVisible);
  if (isVisible) {
    hasPendingHideRef.current = true;
  }
  const [shouldRenderBottomSheetContent, setShouldRenderBottomSheetContent] =
    useState(isVisible);
  if (isVisible && !shouldRenderBottomSheetContent) {
    setShouldRenderBottomSheetContent(true);
  }
  const usesBaseModal = placement === 'top';
  const usesModalLayout = !usesBaseModal && modalLibrary === 'modal';
  const isCountedOpenRef = useRef(false);
  const setCountedOpen = useCallback((counted: boolean) => {
    if (isCountedOpenRef.current === counted) {
      return;
    }
    isCountedOpenRef.current = counted;
    openModalLayoutSheets += counted ? 1 : -1;
  }, []);

  const onAppStateChange = useCallback(
    (status: AppStateStatus) => {
      if (isVisible && !fullscreen && status === 'background') {
        onBackdropPress();
      }
    },
    [isVisible, fullscreen, onBackdropPress],
  );

  useEffect(() => {
    if (!usesModalLayout) {
      setCountedOpen(false);
    } else if (isVisible) {
      setCountedOpen(true);
    }
  }, [isVisible, usesModalLayout, setCountedOpen]);

  useEffect(() => () => setCountedOpen(false), [setCountedOpen]);

  useEffect(() => {
    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [onAppStateChange]);

  const defaultBorderRadius = Platform.OS === 'ios' ? 12 : 0;
  const sheetBackgroundColor = useMemo(
    () =>
      backgroundColor ?? (theme.dark ? (fullscreen ? Black : Overlay) : White),
    [backgroundColor, theme.dark, fullscreen],
  );

  const bottomSheetViewStyles = useMemo(
    () => ({
      backgroundColor: sheetBackgroundColor,
      borderTopLeftRadius: borderRadius ?? defaultBorderRadius,
      borderTopRightRadius: borderRadius ?? defaultBorderRadius,
      paddingBottom: bottomInset,
    }),
    [sheetBackgroundColor, borderRadius, defaultBorderRadius, bottomInset],
  );

  const handleBottomSheetSettle = useCallback(
    (index: number) => {
      if (
        index !== 0 ||
        desiredVisibleRef.current ||
        !hasPendingHideRef.current
      ) {
        return;
      }
      hasPendingHideRef.current = false;
      setCountedOpen(false);
      setShouldRenderBottomSheetContent(false);
      notifyModalHide();
    },
    [notifyModalHide, setCountedOpen],
  );

  useEffect(() => {
    if (usesBaseModal || isVisible || !hasPendingHideRef.current) {
      return;
    }
    const timer = setTimeout(
      () => handleBottomSheetSettle(0),
      HIDE_FALLBACK_DELAY,
    );
    return () => clearTimeout(timer);
  }, [usesBaseModal, isVisible, handleBottomSheetSettle]);

  const bottomSheetDetents = useMemo<ModalDetent[]>(
    () => [
      {value: 0, programmatic: true},
      fullscreen
        ? '100%'
        : (snapPoints?.[0] as `${number}%` | undefined) ?? 'content',
    ],
    [fullscreen, snapPoints],
  );

  const bottomSheetSurface = useMemo(
    () => (
      <View
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: sheetBackgroundColor},
        ]}
      />
    ),
    [sheetBackgroundColor],
  );

  const bottomSheetSurfaceStyle = useMemo(
    () => ({
      borderTopLeftRadius: borderRadius ?? defaultBorderRadius,
      borderTopRightRadius: borderRadius ?? defaultBorderRadius,
    }),
    [borderRadius, defaultBorderRadius],
  );

  const fullscreenStyles = useMemo(
    () =>
      fullscreen
        ? {
            ...bottomSheetViewStyles,
            height: HEIGHT,
            paddingTop: paddingTop ?? insets.top,
          }
        : {...bottomSheetViewStyles, height},
    [fullscreen, bottomSheetViewStyles, paddingTop, insets.top, height],
  );

  const themeValue = useMemo(() => theme as any, [theme]);

  if (usesBaseModal) {
    return (
      <BaseModal
        id={'sheetModal'}
        isVisible={isVisible}
        backdropOpacity={MODAL_LAYOUT_BACKDROP_OPACITY}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        testID="modalBackdrop"
        onBackdropPress={onBackdropPress}
        animationIn={'slideInDown'}
        animationOut={'slideOutUp'}
        onModalHide={onModalHide}
        style={{
          position: 'relative',
          justifyContent: 'flex-start',
          margin: 0,
        }}>
        {children}
        <BlurContainer />
      </BaseModal>
    );
  }

  return (
    <ModalBottomSheet
      index={isVisible ? 1 : 0}
      detents={usesModalLayout ? MODAL_LAYOUT_DETENTS : bottomSheetDetents}
      topInset={0}
      surface={usesModalLayout ? undefined : bottomSheetSurface}
      surfaceStyle={usesModalLayout ? undefined : bottomSheetSurfaceStyle}
      scrimColor={`rgba(0, 0, 0, ${
        usesModalLayout
          ? MODAL_LAYOUT_BACKDROP_OPACITY
          : backdropOpacity ?? DEFAULT_BACKDROP_OPACITY
      })`}
      scrimAccessibilityLabel={t('Dismiss modal')}
      scrollCoordination="none"
      settleDuration={
        disableAnimations
          ? 1
          : usesModalLayout
          ? MODAL_LAYOUT_SETTLE_DURATION
          : undefined
      }
      onCloseRequest={
        usesModalLayout || enableBackdropDismiss !== false
          ? onBackdropPress
          : undefined
      }
      onSettle={handleBottomSheetSettle}>
      {shouldRenderBottomSheetContent ? (
        <NavigationThemeContext.Provider value={themeValue}>
          {usesModalLayout ? (
            <View style={styles.modalLayout}>
              <Pressable
                style={StyleSheet.absoluteFill}
                accessibilityRole="button"
                accessibilityLabel={t('Dismiss modal')}
                onPress={onBackdropPress}
              />
              {children}
              <BlurContainer />
            </View>
          ) : (
            <View style={fullscreenStyles}>{children}</View>
          )}
        </NavigationThemeContext.Provider>
      ) : null}
    </ModalBottomSheet>
  );
};

export default React.memo(SheetModal);
