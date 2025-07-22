import React, {useCallback, useEffect, useRef, useState} from 'react';
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
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (isVisible && !fullscreen && status === 'background') {
        setModalVisible(false);
        onBackdropPress();
      }
    }
    setModalVisible(isVisible);
    if (isVisible && !isModalVisible) {
      bottomSheetModalRef.current?.present();
    } else if (!isVisible && isModalVisible) {
      bottomSheetModalRef.current?.dismiss();
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [isVisible, onBackdropPress]);

  const defaultBorderRadius = Platform.OS === 'ios' ? 12 : 0;
  const bottomSheetViewStyles = {
    backgroundColor:
      backgroundColor ??
      (theme.dark ? (fullscreen ? Black : LightBlack) : White),
    borderTopLeftRadius: borderRadius ?? defaultBorderRadius,
    borderTopRightRadius: borderRadius ?? defaultBorderRadius,
    paddingBottom: bottomInset,
  };

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
    [enableBackdropDismiss, onBackdropPress],
  );

  return modalLibrary === 'bottom-sheet' ? (
    <View testID={'modalBackdrop'}>
      <BottomSheetModal
        stackBehavior={stackBehavior || undefined}
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: 'transparent'}}
        snapPoints={fullscreen ? ['100%'] : snapPoints || undefined}
        enableDismissOnClose={true}
        enableDynamicSizing={!fullscreen && !snapPoints}
        enableOverDrag={false}
        enablePanDownToClose={false}
        handleComponent={null}
        index={0}
        {...(disableAnimations && {animationConfigs: {duration: 1}})}
        accessibilityLabel={'modalBackdrop'}
        ref={bottomSheetModalRef}>
        <NavigationThemeContext.Provider value={theme as any}>
          <BottomSheetView
            style={
              fullscreen
                ? {
                    ...bottomSheetViewStyles,
                    height: HEIGHT,
                    paddingTop: paddingTop ?? insets.top,
                  }
                : {...bottomSheetViewStyles, height}
            }>
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

export default SheetModal;
