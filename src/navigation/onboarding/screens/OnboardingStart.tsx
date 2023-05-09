import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, View} from 'react-native';
import Carousel, {Pagination} from 'react-native-snap-carousel';
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

type OnboardingStartScreenProps = StackScreenProps<
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

  useEffect(() => {
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

  const carouselRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [scrollHintHeight, setScrollHintHeight] = useState(0);

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
          vertical={false}
          layout={'default'}
          useExperimentalSnap={true}
          data={onboardingSlides}
          renderItem={({item}) => <OnboardingSlide item={item} />}
          ref={carouselRef}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
          onScrollIndexChanged={(index: number) => {
            haptic('impactLight');
            setActiveSlideIndex(index);
          }}
          // @ts-ignore
          disableIntervalMomentum={true}
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
            <Pagination
              accessibilityLabel="pagination-button"
              dotsLength={onboardingSlides.length}
              activeDotIndex={activeSlideIndex}
              tappableDots={true}
              carouselRef={carouselRef}
              animatedDuration={100}
              animatedFriction={100}
              animatedTension={100}
              dotStyle={{
                width: 15,
                height: 15,
                borderRadius: 10,
                marginHorizontal: 1,
              }}
              dotColor={Action}
              inactiveDotColor={LuckySevens}
              inactiveDotScale={0.5}
            />
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
