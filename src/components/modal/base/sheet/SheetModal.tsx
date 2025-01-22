import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus, Platform, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {useTheme} from '@react-navigation/native';
import {BlurContainer} from '../../../blur/Blur';
import {HEIGHT, SheetParams} from '../../../styled/Containers';
import BaseModal from '../BaseModal';
import {Black, White} from '../../../../styles/colors';
import {Pressable} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

interface Props extends SheetParams {
  isVisible: boolean;
  fullscreen?: boolean;
  enableBackdropDismiss?: boolean;
  onBackdropPress: (props?: any) => void;
  onModalHide?: () => void;
  children?: any;
  modalLibrary?: 'bottom-sheet' | 'modal';
}

type SheetModalProps = React.PropsWithChildren<Props>;

const AnimatedBackdrop = ({ visible, onPress }: {visible: boolean, onPress: () => any}) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 0.5 : 0, { duration: 300 });
  }, [visible]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: Black,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          onPress();
          opacity.value = withTiming(0, { duration: 300 });
        }}
        style={{ flex: 1 }}
      />
    </Animated.View>
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
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
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

  const renderBackdrop = useCallback(
    () => (
      <AnimatedBackdrop
        visible={isModalVisible}
        onPress={onBackdropPress} />
    ),
    [enableBackdropDismiss, isModalVisible, onBackdropPress],
  );

  return modalLibrary === 'bottom-sheet' ? (
    <View testID={'modalBackdrop'}>
      <BottomSheetModal
        backdropComponent={renderBackdrop}
        backgroundStyle={{borderRadius: 20}}
        snapPoints={fullscreen ? ['100%'] : undefined}
        enableDismissOnClose={true}
        enableDynamicSizing={!fullscreen}
        enableOverDrag={false}
        enablePanDownToClose={false}
        handleComponent={null}
        index={0}
        accessibilityLabel={'modalBackdrop'}
        ref={bottomSheetModalRef}>
        <BottomSheetView
          style={
            fullscreen
              ? {
                  backgroundColor: theme.dark ? Black : White,
                  height: HEIGHT + (Platform.OS === 'android' ? insets.top : 0), // insets.top added to avoid the white gap on android devices
                  paddingTop: insets.top,
                }
              : {}
          }>
          {children}
        </BottomSheetView>
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
