import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
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
import {askForTrackingPermissionAndEnableSdks} from '../../../store/app/app.effects';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {Action, LuckySevens} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
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
  card: require('../../../../assets/img/onboarding/card.png'),
  spend: require('../../../../assets/img/onboarding/spend.png'),
  wallet: require('../../../../assets/img/onboarding/wallet.png'),
  swap: require('../../../../assets/img/onboarding/swap.png'),
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

const ONBOARDING_SLIDES = [
  {
    title: 'Turn crypto into dollars with our BitPay Card',
    text: 'Instantly reload your card balance with no conversion fees. Powered by our competitive exchange rates.',
    subText: '*Currently available in the USA. More countries coming soon.',
    img: () => (
      <OnboardingImage
        style={{height: 247, width: 170}}
        source={OnboardingImages.card}
      />
    ),
  },
  {
    title: 'Spend crypto at your favorite places',
    text: 'Discover a curated list of places you can spend your crypto. Purchase, manage and spend store credits instantly.',
    img: () => (
      <OnboardingImage
        style={{height: 247, width: 175}}
        source={OnboardingImages.spend}
      />
    ),
  },
  {
    title: 'Keep your funds safe & secure',
    text: 'Websites and exchanges get hacked. BitPay allows you to privately store, manage and use your crypto funds without having to trust a centralized bank or exchange.',
    img: () => (
      <OnboardingImage
        style={{height: 170, width: 205}}
        source={OnboardingImages.wallet}
      />
    ),
  },
  {
    title: 'Seamlessly buy & swap with a decentralized exchange',
    text: 'Buy with a credit card or existing funds, then seamlessly swap coins at competitive rates without leaving the app.',
    img: () => (
      <OnboardingImage
        style={{height: 218, width: 194}}
        source={OnboardingImages.swap}
      />
    ),
  },
];

const OnboardingStart: React.FC<OnboardingStartScreenProps> = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isPaired = useAppSelector(({APP, BITPAY_ID}) => {
    return !!BITPAY_ID.apiToken[APP.network];
  });

  useAndroidBackHandler(() => true);

  const askForTrackingThenNavigate = useCallback(
    async (cb: () => void) => {
      haptic('impactLight');
      await dispatch(askForTrackingPermissionAndEnableSdks());
      cb();
    },
    [dispatch],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          {isPaired ? (
            <Button
              buttonType="pill"
              onPress={() => {
                haptic('impactLight');
                dispatch(BitPayIdEffects.startDisconnectBitPayId());
              }}>
              Log Out
            </Button>
          ) : (
            <Button
              buttonType={'pill'}
              onPress={() =>
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
                })
              }>
              Log In
            </Button>
          )}
        </HeaderRightContainer>
      ),
    });
  }, [navigation, isPaired, dispatch, askForTrackingThenNavigate]);

  const carouselRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [scrollHintHeight, setScrollHintHeight] = useState(0);

  return (
    <OnboardingContainer>
      <ScrollView scrollEnabled={scrollEnabledForSmallScreens}>
        <Carousel
          vertical={false}
          layout={'default'}
          useExperimentalSnap={true}
          data={ONBOARDING_SLIDES}
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
        onLayout={e => {
          setScrollHintHeight(e.nativeEvent.layout.height + 20);
        }}>
        <Row>
          <Column>
            <Pagination
              dotsLength={ONBOARDING_SLIDES.length}
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
                buttonStyle={'primary'}
                onPress={() => {
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Auth', {
                      screen: 'CreateAccount',
                    });
                  });
                }}>
                Get Started
              </Button>
            ) : (
              <Button
                buttonStyle={'primary'}
                onPress={() => {
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Onboarding', {
                      screen: 'Notifications',
                    });
                  });
                }}>
                Continue
              </Button>
            )}
          </Column>
        </Row>
        {!isPaired ? (
          <Row>
            <ActionContainer>
              <Button
                buttonType={'link'}
                onPress={() => {
                  askForTrackingThenNavigate(() => {
                    navigation.navigate('Onboarding', {
                      screen: 'Notifications',
                    });
                  });
                }}>
                <LinkText>Continue without an account</LinkText>
              </Button>
            </ActionContainer>
          </Row>
        ) : null}
      </CtaContainerAbsolute>
    </OnboardingContainer>
  );
};

export default OnboardingStart;
