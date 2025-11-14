import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {AppState, AppStateStatus, Platform, View} from 'react-native';
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
import {Black, LightBlack, White} from '../../../../styles/colors';

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

  const [isModalVisible, setModalVisible] = useState(isVisible);
  // Track transitional states to allow immediate re-open after dismiss
  const isDismissingRef = useRef(false);
  const pendingOpenRef = useRef(false);

  const onAppStateChange = useCallback((status: AppStateStatus) => {
    if (isVisible && !fullscreen && status === 'background') {
      setModalVisible(false);
      onBackdropPress();
    }
  }, [isVisible, fullscreen, onBackdropPress]);

  useEffect(() => {
    setModalVisible(isVisible);
    // Imperatively control bottom sheet to avoid race conditions between dismiss and present
    if (modalLibrary === 'bottom-sheet') {
      if (isVisible && !isModalVisible) {
        // If a dismiss animation is in progress, queue the open until onDismiss fires
        if (isDismissingRef.current) {
          pendingOpenRef.current = true;
        } else {
          bottomSheetModalRef.current?.present();
        }
      } else if (!isVisible && isModalVisible) {
        isDismissingRef.current = true;
        bottomSheetModalRef.current?.dismiss();
      }
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [isVisible, isModalVisible, modalLibrary, onAppStateChange]);

  const defaultBorderRadius = Platform.OS === 'ios' ? 12 : 0;
  const sheetBackgroundColor = useMemo(() =>
    backgroundColor ?? (theme.dark ? (fullscreen ? Black : LightBlack) : White),
    [backgroundColor, theme.dark, fullscreen]
  );

  const bottomSheetViewStyles = useMemo(() => ({
    backgroundColor: sheetBackgroundColor,
    borderTopLeftRadius: borderRadius ?? defaultBorderRadius,
    borderTopRightRadius: borderRadius ?? defaultBorderRadius,
    paddingBottom: bottomInset,
  }), [sheetBackgroundColor, borderRadius, defaultBorderRadius, bottomInset]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        onPress={onBackdropPress}
        pressBehavior={enableBackdropDismiss === false ? 'none' : 'close'}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
      />
    ),
    [enableBackdropDismiss, onBackdropPress, backdropOpacity],
  );

  const handleDismiss = useCallback(() => {
    // Mark dismiss finished and flush any pending open request immediately
    isDismissingRef.current = false;
    if (pendingOpenRef.current) {
      pendingOpenRef.current = false;
      // Schedule on next frame to ensure internal state is fully reset
      requestAnimationFrame(() => {
        bottomSheetModalRef.current?.present();
      });
    }
    // Maintain parity with BaseModal's onModalHide if provided
    onModalHide?.();
  }, [onModalHide]);

  const fullscreenStyles = useMemo(() => 
    fullscreen
      ? {
          ...bottomSheetViewStyles,
          height: HEIGHT,
          paddingTop: paddingTop ?? insets.top,
        }
      : {...bottomSheetViewStyles, height},
    [fullscreen, bottomSheetViewStyles, paddingTop, insets.top, height]
  );

  // Memoizar el valor del tema
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
        onDismiss={handleDismiss}
        ref={bottomSheetModalRef}>
        <NavigationThemeContext.Provider value={themeValue}>
          <BottomSheetView style={fullscreenStyles}>
            {children}
          </BottomSheetView>
        </NavigationThemeContext.Provider>
      </BottomSheetModal>
    </View>
  ) : (
    <BaseModal
      id={'sheetModal'}
      isVisible={isModalVisible}
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