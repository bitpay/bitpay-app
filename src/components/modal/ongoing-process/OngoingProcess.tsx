import React, {useCallback, useEffect, useRef} from 'react';
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

// Get full screen dimensions (includes navigation bar on Android)
const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get(
  Platform.OS === 'android' ? 'screen' : 'window',
);

export type OnGoingProcessMessages =
  | 'GENERAL_AWAITING'
  | 'CREATING_KEY'
  | 'LOGGING_IN'
  | 'LOGGING_OUT'
  | 'PAIRING'
  | 'CREATING_ACCOUNT'
  | 'UPDATING_ACCOUNT'
  | 'IMPORTING'
  | 'IMPORT_SCANNING_FUNDS'
  | 'DELETING_KEY'
  | 'ADDING_WALLET'
  | 'ADDING_ACCOUNT'
  | 'ADDING_EVM_CHAINS'
  | 'ADDING_SPL_CHAINS'
  | 'LOADING'
  | 'FETCHING_PAYMENT_OPTIONS'
  | 'FETCHING_PAYMENT_INFO'
  | 'JOIN_WALLET'
  | 'SENDING_PAYMENT'
  | 'ACCEPTING_PAYMENT'
  | 'GENERATING_ADDRESS'
  | 'GENERATING_GIFT_CARD'
  | 'SYNCING_WALLETS'
  | 'REJECTING_CALL_REQUEST'
  | 'SAVING_LAYOUT'
  | 'SAVING_ADDRESSES'
  | 'EXCHANGE_GETTING_DATA'
  | 'CALCULATING_FEE'
  | 'CONNECTING_COINBASE'
  | 'FETCHING_COINBASE_DATA'
  | 'UPDATING_TXP'
  | 'CREATING_TXP'
  | 'SENDING_EMAIL'
  | 'REDIRECTING'
  | 'REMOVING_BILL'
  | 'BROADCASTING_TXP'
  | 'SWEEPING_WALLET'
  | 'SCANNING_FUNDS'
  | 'SCANNING_FUNDS_WITH_PASSPHRASE';

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
`;

const ModalWrapper = styled.View`
  height: ${HEIGHT}px;
  width: ${WIDTH}px;
  align-items: center;
  justify-content: center;
  margin-left: -20px;
`;

const OnGoingProcessModal: React.FC = () => {
  const message = useAppSelector(({APP}) => APP.onGoingProcessModalMessage);
  const isVisible = useAppSelector(({APP}) => APP.showOnGoingProcessModal);
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

  return modalLibrary === 'bottom-sheet' ? (
    <BottomSheetModal
      detached={true}
      bottomInset={0}
      backdropComponent={renderBackdrop}
      backgroundStyle={{borderRadius: 18}}
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
        <Animated.View style={[animatedStyles]}>
          <Row>
            <ActivityIndicatorContainer>
              <ActivityIndicator color={SlateDark} />
            </ActivityIndicatorContainer>
            <Message>{message}</Message>
            <BlurContainer />
          </Row>
        </Animated.View>
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
      <ModalWrapper>
        <Row>
          <ActivityIndicatorContainer>
            <ActivityIndicator color={SlateDark} />
          </ActivityIndicatorContainer>
          <Message>{message}</Message>
          <BlurContainer />
        </Row>
      </ModalWrapper>
    </BaseModal>
  );
};

export default OnGoingProcessModal;
