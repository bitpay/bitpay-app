import React, {useCallback, useEffect, useRef, useMemo} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '../../../contexts';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {useAppSelector} from '../../../utils/hooks';
import {BlurContainer} from '../../blur/Blur';
import {BaseText} from '../../styled/Text';
import BaseModal from '../base/BaseModal';
import {HEIGHT, WIDTH} from '../../styled/Containers';
import {useOngoingProcess} from '../../../contexts';

// Get full screen dimensions (includes navigation bar on Android)
const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get(
  Platform.OS === 'android' ? 'screen' : 'window',
);

const styles = StyleSheet.create({
  row: {
    borderRadius: 10,
    flexDirection: 'row',
    padding: 20,
    maxWidth: '60%',
    paddingRight: 47,
  },
  activityIndicatorContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  message: {
    fontWeight: '700',
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  modalWrapper: {
    height: HEIGHT,
    width: WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
  },
});

const OnGoingProcessModal: React.FC = React.memo(() => {
  const {message, isVisible} = useOngoingProcess();
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const theme = useTheme();

  const modalLibrary: 'bottom-sheet' | 'modal' = 'modal';
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const opacityFadeDuration = 200;
  const opacity = useSharedValue(0);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      height: HEIGHT,
      width: WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    };
  });

  useEffect(() => {
    let dismissTimeout: NodeJS.Timeout;
    let opacityTimeout: NodeJS.Timeout;

    if (isVisible && appWasInit) {
      bottomSheetModalRef.current?.present();
      opacityTimeout = setTimeout(() => {
        opacity.value = withTiming(1, {duration: opacityFadeDuration});
      }, 300);
    } else {
      opacity.value = withTiming(0, {duration: opacityFadeDuration});
      dismissTimeout = setTimeout(() => {
        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.dismiss();
        }
      }, opacityFadeDuration);
    }

    return () => {
      if (dismissTimeout) {
        clearTimeout(dismissTimeout);
      }
      if (opacityTimeout) {
        clearTimeout(opacityTimeout);
      }
    };
  }, [appWasInit, isVisible, opacity, opacityFadeDuration]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.4}
        pressBehavior={'none'}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const modalContent = useMemo(
    () => (
      <View style={[styles.row, {backgroundColor: theme.dark ? LightBlack : White}]}>
        <View style={styles.activityIndicatorContainer}>
          <ActivityIndicator color={SlateDark} />
        </View>
        <BaseText style={styles.message}>{message}</BaseText>
        <BlurContainer />
      </View>
    ),
    [message, theme.dark],
  );

  const bottomSheetBackgroundStyle = useMemo(() => ({borderRadius: 18}), []);

  return modalLibrary === 'bottom-sheet' ? (
    <BottomSheetModal
      detached={true}
      bottomInset={0}
      backdropComponent={renderBackdrop}
      backgroundStyle={bottomSheetBackgroundStyle}
      enableDismissOnClose={true}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose={false}
      handleComponent={null}
      animateOnMount={true}
      backgroundComponent={null}
      snapPoints={['100%']}
      index={0}
      ref={bottomSheetModalRef}>
      <BottomSheetView>
        <Animated.View style={[animatedStyles]}>{modalContent}</Animated.View>
      </BottomSheetView>
    </BottomSheetModal>
  ) : (
    <BaseModal
      id={'ongoingProcess'}
      deviceHeight={SCREEN_HEIGHT}
      deviceWidth={SCREEN_WIDTH}
      presentationStyle="overFullScreen"
      isVisible={appWasInit && isVisible}
      backdropOpacity={0.4}
      coverScreen={true}
      statusBarTranslucent={true}
      animationIn={'fadeInRight'}
      animationOut={'fadeOutLeft'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}>
      <View style={styles.modalWrapper}>{modalContent}</View>
    </BaseModal>
  );
});

export default OnGoingProcessModal;
