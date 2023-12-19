import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, View} from 'react-native';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainerAbsolute,
  HeaderRightContainer,
  HEIGHT,
  WIDTH,
} from '../../../components/styled/Containers';
import {Link} from '../../../components/styled/Text';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {Action, LuckySevens} from '../../../styles/colors';
import {
  useAppDispatch,
  useAppSelector,
  useRequestTrackingPermissionHandler,
} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';
import OnboardingSlide from '../components/OnboardingSlide';
import ScrollHint, {ScrollHintContainer} from '../components/ScrollHint';
import {OnboardingStackParamList} from '../OnboardingStack';
import PaginationDots from '../../../components/pagination-dots/PaginationDots';
import {useSharedValue} from 'react-native-reanimated';

type OnboardingStartScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'OnboardingStart'
>;

// IMAGES
const OnboardingImages = {
  // card: {
  //   light: (
  //     <OnboardingImage
  //       style={{height: 247, width: 215}}
  //       source={require('../../../../assets/img/onboarding/light/card.png')}
  //     />
  //   ),
  //   dark: (
  //     <OnboardingImage
  //       style={{height: 247, width: 192}}
  //       source={require('../../../../assets/img/onboarding/dark/card.png')}
  //     />
  //   ),
  // },
  spend: {
    light: (
      <OnboardingImage
        style={{height: 247, width: 217}}
        source={require('../../../../assets/img/onboarding/light/spend.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{height: 247, width: 200}}
        source={require('../../../../assets/img/onboarding/dark/spend.png')}
      />
    ),
  },
  wallet: {
    light: (
      <OnboardingImage
        style={{height: 170, width: 220}}
        source={require('../../../../assets/img/onboarding/light/wallet.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{height: 170, width: 230}}
        source={require('../../../../assets/img/onboarding/dark/wallet.png')}
      />
    ),
  },
  swap: {
    light: (
      <OnboardingImage
        style={{height: 203, width: 210}}
        source={require('../../../../assets/img/onboarding/light/swap.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{height: 170, width: 200}}
        source={require('../../../../assets/img/onboarding/dark/swap.png')}
      />
    ),
  },
};

const OnboardingContainer = styled.SafeAreaView`
  flex: 1;
  position: relative;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
`;

const Column = styled.View`
  flex-direction: column;
  justify-content: center;
  margin: 0 5px;
  flex: 1;
`;

const LinkText = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;

// estimated a number, tweak if neccessary based on the content length
const scrollEnabledForSmallScreens = HEIGHT < 700;

const OnboardingStart: React.VFC<OnboardingStartScreenProps> = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const themeType = useThemeType();
  const isPaired = useAppSelector(
    ({APP, BITPAY_ID}) => !!BITPAY_ID.apiToken[APP.network],
  );

  useAndroidBackHandler(() => true);

  const askForTrackingThenNavigate = useRequestTrackingPermissionHandler();

  const onLoginPress = () => {
    haptic('impactLight');
    askForTrackingThenNavigate(() => {
      navigation.navigate('Auth', {
        screen: 'Login',
        params: {
          onLoginSuccess: async () => {
            haptic('impactLight');
            navigation.navigate('Onboarding', {
              screen: 'Notifications',
            });
          },
        },
      });
    });
  };
  const onLoginPressRef = useRef(onLoginPress);
  onLoginPressRef.current = onLoginPress;

  const onLogoutPress = () => {
    haptic('impactLight');
    dispatch(BitPayIdEffects.startDisconnectBitPayId());
  };
  const onLogoutPressRef = useRef(onLogoutPress);
  onLogoutPressRef.current = onLogoutPress;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          {isPaired ? (
            <Button
              accessibilityLabel="log-out-button"
              buttonType="pill"
              onPress={onLogoutPressRef.current}>
              {t('Log Out')}
            </Button>
          ) : (
            <Button
              accessibilityLabel="log-in-button"
              buttonType={'pill'}
              onPress={onLoginPressRef.current}>
              {t('Log In')}
            </Button>
          )}
        </HeaderRightContainer>
      ),
    });
  }, [navigation, isPaired, t]);

  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [scrollHintHeight, setScrollHintHeight] = useState(0);
  const progressValue = useSharedValue<number>(0);

  const onboardingSlides = [
    // {
    //   title: t('Turn crypto into dollars with our BitPay Card'),
    //   text: t(
    //     'Instantly reload your card balance with no conversion fees. Powered by our competitive exchange rates.',
    //   ),
    //   subText: t(
    //     '*Currently available in the USA. More countries coming soon.',
    //   ),
    //   img: () => OnboardingImages.card[themeType],
    // },
    {
      title: t('Seamlessly buy & swap'),
      text: t(
        'BitPay partners with multiple crypto marketplaces to ensure you get the best possible rates. Buy and swap 60+ top cryptocurrencies without leaving the app.',
      ),
      img: () => OnboardingImages.swap[themeType],
    },
    {
      title: t('Spend crypto at your favorite places'),
      text: t(
        'Discover a curated list of places you can spend your crypto. Purchase, manage and spend store credits instantly.',
      ),
      img: () => OnboardingImages.spend[themeType],
    },
    {
      title: t('Keep your funds safe & secure'),
      text: t(
        "Websites and exchanges get hacked. BitPay's self - custody wallet allows you to privately store, manage and use your crypto funds without a centralized bank or exchange.",
      ),
      img: () => OnboardingImages.wallet[themeType],
    },
  ];

  return (
    <OnboardingContainer accessibilityLabel="onboarding-start-view">
      <ScrollView scrollEnabled={scrollEnabledForSmallScreens}>
        <Carousel
          loop={false}
          vertical={false}
          width={WIDTH}
          height={WIDTH * 2}
          autoPlay={false}
          data={onboardingSlides}
          pagingEnabled={true}
          snapEnabled={true}
          ref={carouselRef}
          scrollAnimationDuration={1000}
          onProgressChange={(_, index) => {
            if (Number.isInteger(index)) {
              setActiveSlideIndex(index);
            }
            progressValue.value = index;
          }}
          renderItem={({item}) => <OnboardingSlide item={item} />}
        />
        <View style={{height: scrollHintHeight}} />
      </ScrollView>

      <ScrollHintContainer>
        <ScrollHint height={scrollHintHeight} />
      </ScrollHintContainer>

      <CtaContainerAbsolute
        accessibilityLabel="cta-container"
        onLayout={e => {
          setScrollHintHeight(e.nativeEvent.layout.height + 20);
        }}>
        <Row>
          <Column>
            <Row>
              {[...Array(onboardingSlides.length)].map((_, index) => {
                return (
                  <PaginationDots
                    animValue={progressValue}
                    index={index}
                    key={index}
                    isRotate={false}
                    length={onboardingSlides.length}
                  />
                );
              })}
            </Row>
          </Column>
          <Column>
            {!isPaired ? (
              <Button
                accessibilityLabel="get-started-button"
                buttonStyle={'primary'}
                onPress={() => {
                  haptic('impactLight');
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Auth', {
                      screen: 'CreateAccount',
                    });
                  });
                }}>
                {t('Get Started')}
              </Button>
            ) : (
              <Button
                accessibilityLabel="continue-button"
                buttonStyle={'primary'}
                onPress={() => {
                  haptic('impactLight');
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Onboarding', {
                      screen: 'Notifications',
                    });
                  });
                }}>
                {t('Continue')}
              </Button>
            )}
          </Column>
        </Row>
        {!isPaired ? (
          <Row>
            <ActionContainer>
              <Button
                accessibilityLabel="continue-without-an-account-button"
                buttonType={'link'}
                onPress={() => {
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Onboarding', {
                      screen: 'Notifications',
                    });
                  });
                }}>
                <LinkText>{t('Continue without an account')}</LinkText>
              </Button>
            </ActionContainer>
          </Row>
        ) : null}
      </CtaContainerAbsolute>
    </OnboardingContainer>
  );
};

export default OnboardingStart;
