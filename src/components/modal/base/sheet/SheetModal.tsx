import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {AppState, AppStateStatus, Platform, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {useTheme} from 'styled-components/native';
import {ThemeContext as NavigationThemeContext} from '@react-navigation/native';
import {BlurContainer} from '../../../blur/Blur';
import {HEIGHT, SheetParams} from '../../../styled/Containers';
import BaseModal from '../BaseModal';
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
  stackBehavior?: 'push' | 'replace';
}

type SheetModalProps = React.PropsWithChildren<Props>;

type BottomSheetPhase = 'idle' | 'presenting' | 'presented' | 'dismissing';

type ControlledBackdropProps = BottomSheetBackdropProps & {
  backdropOpacity?: number;
  enableBackdropDismiss: boolean;
  onBackdropPress: () => void;
};

const ControlledBottomSheetBackdrop: React.FC<ControlledBackdropProps> = ({
  backdropOpacity,
  enableBackdropDismiss,
  onBackdropPress,
  ...backdropProps
}) => {
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enableBackdropDismiss)
        .onEnd((_event, success) => {
          if (success) {
            runOnJS(onBackdropPress)();
          }
        }),
    [enableBackdropDismiss, onBackdropPress],
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <BottomSheetBackdrop
        {...backdropProps}
        pressBehavior="none"
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        accessible={enableBackdropDismiss}
        accessibilityRole={enableBackdropDismiss ? 'button' : undefined}
        accessibilityLabel={enableBackdropDismiss ? 'Dismiss modal' : undefined}
        accessibilityHint={
          enableBackdropDismiss ? 'Closes the modal' : undefined
        }
      />
    </GestureDetector>
  );
};

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
  stackBehavior,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;
  const theme = useTheme();

  const phaseRef = useRef<BottomSheetPhase>('idle');
  const nativeReadyRef = useRef(false);
  const desiredVisibleRef = useRef(isVisible);
  const usesBottomSheetRef = useRef(modalLibrary === 'bottom-sheet');
  const mountedRef = useRef(false);
  const reopenAnimationFrameRef = useRef<number | null>(null);
  desiredVisibleRef.current = isVisible;
  usesBottomSheetRef.current = modalLibrary === 'bottom-sheet';

  const reconcileBottomSheet = useCallback(() => {
    if (!mountedRef.current || !usesBottomSheetRef.current) {
      return;
    }

    const modal = bottomSheetModalRef.current;
    if (!modal) {
      return;
    }

    if (desiredVisibleRef.current && phaseRef.current === 'idle') {
      nativeReadyRef.current = false;
      phaseRef.current = 'presenting';
      try {
        modal.present();
      } catch (error) {
        phaseRef.current = 'idle';
        throw error;
      }
      return;
    }

    const phase = phaseRef.current;
    if (
      !desiredVisibleRef.current &&
      (phase === 'presented' ||
        (phase === 'presenting' && nativeReadyRef.current))
    ) {
      phaseRef.current = 'dismissing';
      try {
        modal.dismiss();
      } catch (error) {
        phaseRef.current = phase;
        throw error;
      }
    }
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reopenAnimationFrameRef.current !== null) {
        cancelAnimationFrame(reopenAnimationFrameRef.current);
        reopenAnimationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (modalLibrary === 'bottom-sheet') {
      reconcileBottomSheet();
    } else {
      phaseRef.current = 'idle';
      nativeReadyRef.current = false;
    }
  }, [isVisible, modalLibrary, reconcileBottomSheet]);

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

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <ControlledBottomSheetBackdrop
        {...props}
        onBackdropPress={onBackdropPress}
        enableBackdropDismiss={enableBackdropDismiss !== false}
        backdropOpacity={backdropOpacity}
      />
    ),
    [enableBackdropDismiss, onBackdropPress, backdropOpacity],
  );

  const handleBottomSheetAnimate = useCallback(() => {
    if (
      !mountedRef.current ||
      !usesBottomSheetRef.current ||
      phaseRef.current !== 'presenting'
    ) {
      return;
    }
    // Native onAnimate requires mounted, layout-ready content. An interrupted
    // opening can finish at -1 with only onClose, never confirming onChange(0).
    // Allow parent closure after this readiness signal, not merely present().
    nativeReadyRef.current = true;
    reconcileBottomSheet();
  }, [reconcileBottomSheet]);

  const handleBottomSheetChange = useCallback(
    (index: number) => {
      if (
        index < 0 ||
        !mountedRef.current ||
        (phaseRef.current !== 'presenting' && phaseRef.current !== 'presented')
      ) {
        return;
      }
      nativeReadyRef.current = true;
      phaseRef.current = 'presented';
      reconcileBottomSheet();
    },
    [reconcileBottomSheet],
  );

  const handleDismiss = useCallback(() => {
    if (phaseRef.current === 'idle') {
      return;
    }

    const wasParentDismissal = phaseRef.current === 'dismissing';
    phaseRef.current = 'idle';
    nativeReadyRef.current = false;

    // Provider replacement/dismissal is a close request, not a new open intent.
    if (
      !wasParentDismissal &&
      mountedRef.current &&
      desiredVisibleRef.current
    ) {
      onBackdropPress();
    }
    onModalHide?.();

    if (
      wasParentDismissal &&
      mountedRef.current &&
      desiredVisibleRef.current &&
      reopenAnimationFrameRef.current === null
    ) {
      reopenAnimationFrameRef.current = requestAnimationFrame(() => {
        reopenAnimationFrameRef.current = null;
        if (mountedRef.current && desiredVisibleRef.current) {
          reconcileBottomSheet();
        }
      });
    }
  }, [onBackdropPress, onModalHide, reconcileBottomSheet]);

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

  return modalLibrary === 'bottom-sheet' ? (
    <View testID={'modalBackdrop'}>
      <BottomSheetModal
        accessible={false}
        stackBehavior={stackBehavior || undefined}
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: sheetBackgroundColor}}
        snapPoints={fullscreen ? ['100%'] : snapPoints || undefined}
        enableDismissOnClose={true}
        enableDynamicSizing={!fullscreen && !snapPoints}
        enableOverDrag={false}
        enablePanDownToClose={false}
        handleComponent={null}
        index={0}
        {...(disableAnimations && {animationConfigs: {duration: 1}})}
        accessibilityLabel={'modalBackdrop'}
        onAnimate={handleBottomSheetAnimate}
        onChange={handleBottomSheetChange}
        onDismiss={handleDismiss}
        ref={bottomSheetModalRef}>
        <NavigationThemeContext.Provider value={themeValue}>
          <BottomSheetView style={fullscreenStyles}>{children}</BottomSheetView>
        </NavigationThemeContext.Provider>
      </BottomSheetModal>
    </View>
  ) : (
    <BaseModal
      id={'sheetModal'}
      isVisible={isVisible}
      backdropOpacity={0.4}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      testID="modalBackdrop"
      onBackdropPress={onBackdropPress}
      animationIn={placement === 'top' ? 'slideInDown' : 'slideInUp'}
      animationOut={placement === 'top' ? 'slideOutUp' : 'slideOutDown'}
      onModalHide={onModalHide}
      // swipeDirection={'down'}
      // onSwipeComplete={hideModal}
      style={{
        position: 'relative',
        justifyContent: placement === 'top' ? 'flex-start' : 'flex-end',
        margin: 0,
      }}>
      <>
        {children}
        <BlurContainer />
      </>
    </BaseModal>
  );
};

export default React.memo(SheetModal);
