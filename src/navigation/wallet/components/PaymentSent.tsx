import React, {useState} from 'react';
import Modal from 'react-native-modal';
import styled from 'styled-components/native';
import {Success, White} from '../../../styles/colors';
import {
  CloseButtonContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import PaymentCompleteSvg from '../../../../assets/img/wallet/payment-complete.svg';
import {BaseText} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import {useEffect} from 'react';

const AnimatedContainer = Animated.createAnimatedComponent(styled.View`
  flex: 1;
  width: ${WIDTH}px;
`);

const PaymentSentContainer = styled.View`
  flex: 1;
  background-color: ${Success};
  width: ${WIDTH}px;
`;

const PaymentSentHero = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const PaymentSentFooter = styled.View`
  border-top-width: 1px;
  border-top-color: ${White};
  align-items: center;
`;

const Title = styled(BaseText)`
  font-size: 28px;
  font-weight: 500;
  color: ${White};
  margin-top: 15px;
`;

const CloseText = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  color: ${White};
  padding-bottom: 10px;
`;

interface PaymentSentModal {
  isVisible?: boolean;
  onCloseModal?: () => void;
  title?: string;
}

export interface PaymentSentModalConfig {
  isVisible: boolean;
  onCloseModal: () => void;
  title?: string;
}

const PaymentSent = ({
  isVisible: _isVisible,
  onCloseModal: _onCloseModal,
  title: _title,
}: PaymentSentModal) => {
  const {t} = useTranslation();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showPaymentSentModal || _isVisible,
  );
  const config = useSelector(({APP}: RootState) => APP.paymentSentModalConfig);

  const {onCloseModal, title} = config || {
    onCloseModal: _onCloseModal!,
    title: _title!,
  };
  const [showContent, setShowContent] = useState(false);

  const bgProgress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const backdropColor = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.1);
  const footerTranslateY = useSharedValue(100);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      backdropOpacity.value = withTiming(1, {duration: 400});
      backdropColor.value = withTiming(1, {duration: 400});
    } else {
      backdropOpacity.value = withTiming(0, {duration: 300});
      backdropColor.value = withTiming(0, {duration: 300});
    }
  }, [isVisible]);

  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        backdropColor.value,
        [0, 1],
        ['#FFFFFF', Success],
      ),
      opacity: backdropOpacity.value,
    };
  });

  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{scale: heroScale.value}],
  }));

  const animatedFooterStyle = useAnimatedStyle(() => ({
    transform: [{translateY: footerTranslateY.value}],
    opacity: footerOpacity.value,
  }));

  useEffect(() => {
    // @ts-ignore
    let bgTimer, heroTimer, footerTimer;
    if (isVisible) {
      setShowContent(true);
      bgTimer = setTimeout(() => {
        bgProgress.value = withTiming(1, {duration: 500});
      }, 300);

      heroTimer = setTimeout(() => {
        heroOpacity.value = withTiming(1, {duration: 0});
        heroScale.value = withSpring(1, {
          damping: 10,
          stiffness: 100,
        });
      }, 1200);

      footerTimer = setTimeout(() => {
        footerOpacity.value = withTiming(1, {duration: 400});
        footerTranslateY.value = withSpring(0, {
          damping: 10,
          stiffness: 100,
        });
      }, 2000);
    } else {
      heroOpacity.value = 0;
      heroScale.value = 0.1;
      footerTranslateY.value = 100;
      footerOpacity.value = 0;
      bgProgress.value = 0;
      setShowContent(false);
    }

    return () => {
      // @ts-ignore
      clearTimeout(bgTimer);
      // @ts-ignore
      clearTimeout(heroTimer);
      // @ts-ignore
      clearTimeout(footerTimer);
    };
  }, [isVisible]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      bgProgress.value,
      [0, 1],
      ['#FFFFFF', Success],
    );
    return {backgroundColor};
  });

  return (
    <View style={{backgroundColor: Success}}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          },
          animatedBackdropStyle,
        ]}
      />
      <Modal
        isVisible={isVisible}
        backdropOpacity={0}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        hideModalContentWhileAnimating={true}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        style={{margin: 0, justifyContent: 'center'}}>
        <AnimatedContainer style={animatedContainerStyle}>
          {showContent && (
            <>
              <Animated.View
                style={[
                  {flex: 1, justifyContent: 'center', alignItems: 'center'},
                  animatedHeroStyle,
                ]}>
                <PaymentSentHero>
                  <PaymentCompleteSvg />
                  <Title>{title || t('Payment Sent')}</Title>
                </PaymentSentHero>
              </Animated.View>

              <Animated.View style={animatedFooterStyle}>
                <PaymentSentFooter>
                  <CloseButtonContainer
                    style={{paddingBottom: 20, marginTop: 25}}
                    onPress={() => {
                      haptic('impactLight');
                      onCloseModal();
                    }}>
                    <CloseText>{t('CLOSE')}</CloseText>
                  </CloseButtonContainer>
                </PaymentSentFooter>
              </Animated.View>
            </>
          )}
        </AnimatedContainer>
      </Modal>
    </View>
  );
};

export default PaymentSent;
