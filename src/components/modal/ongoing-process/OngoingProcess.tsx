import React, {useCallback, useEffect, useRef, useMemo} from 'react';
import {ActivityIndicator, Dimensions, Platform} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import styled from 'styled-components/native';
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

const Row = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  border-radius: 10px;
  flex-direction: row;
  padding: 20px;
  max-width: 60%;
  padding-right: 47px;
`;

const ActivityIndicatorContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const Message = styled(BaseText)`
  font-weight: 700;
  flex-wrap: wrap;
  line-height: 22px;
`;

const ModalWrapper = styled.View`
  height: ${HEIGHT}px;
  width: ${WIDTH}px;
  align-items: center;
  justify-content: center;
  margin-left: -20px;
`;

const OnGoingProcessModal: React.FC = React.memo(() => {
  const {message, isVisible} = useOngoingProcess();
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);

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
      <Row>
        <ActivityIndicatorContainer>
          <ActivityIndicator color={SlateDark} />
        </ActivityIndicatorContainer>
        <Message>{message}</Message>
        <BlurContainer />
      </Row>
    ),
    [message],
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
      <ModalWrapper>{modalContent}</ModalWrapper>
    </BaseModal>
  );
});

export default OnGoingProcessModal;
