import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {StatusBar} from 'react-native';
import Carousel, {Pagination} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  CtaContainerAbsolute,
  HeaderRightContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import {Action} from '../../../styles/colors';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';
import OnboardingSlide from '../components/OnboardingSlide';
import {OnboardingStackParamList} from '../OnboardingStack';

type OnboardingStartScreenProps = StackScreenProps<
  OnboardingStackParamList,
  'OnboardingStart'
>;

// IMAGES
const OnboardingImages = {
  card: {
    light: require('../../../../assets/img/onboarding/light/card.png'),
    dark: require('../../../../assets/img/onboarding/dark/card.png'),
  },
  spend: {
    light: require('../../../../assets/img/onboarding/light/spend.png'),
    dark: require('../../../../assets/img/onboarding/dark/spend.png'),
  },
  wallet: {
    light: require('../../../../assets/img/onboarding/light/wallet.png'),
    dark: require('../../../../assets/img/onboarding/dark/wallet.png'),
  },
  swap: {
    light: require('../../../../assets/img/onboarding/light/swap.png'),
    dark: require('../../../../assets/img/onboarding/dark/swap.png'),
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

const OnboardingStart: React.FC<OnboardingStartScreenProps> = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Auth', {
                screen: 'LoginSignup',
                params: {context: 'login'},
              });
            }}>
            Log In
          </Button>
        </HeaderRightContainer>
      ),
    });
  });

  const themeType = useThemeType();
  const ref = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const onboardingSlides = [
    {
      title: 'Turn crypto into dollars with our BitPay card',
      text: 'Instantly reload your card balance with no conversion fees. Powered by our competitive exchange rates.',
      subText: '*Currently available in the USA. More countries coming soon.',
      img: () => <OnboardingImage source={OnboardingImages.card[themeType]} />,
    },
    {
      title: 'Spend crypto at your favorite places',
      text: 'Discover a curated list of places you can spend your crypto. Purchase, manage, & spend store credits instantly.',
      img: () => <OnboardingImage source={OnboardingImages.spend[themeType]} />,
    },
    {
      title: 'Keep your funds safe & secure',
      text: 'Websites and exchanges get hacked. BitPay allows you to privately store, manage, and use your crypto funds without having to trust a centralized bank or exchange.',
      img: () => (
        <OnboardingImage source={OnboardingImages.wallet[themeType]} />
      ),
    },
    {
      title: 'Seamlessly buy & swap with a decentralized exchange',
      text: 'Buy with a credit card or existing funds, then seamlessly swap coins at competitive rates without leaving the app.',
      img: () => <OnboardingImage source={OnboardingImages.swap[themeType]} />,
    },
  ];

  return (
    <OnboardingContainer>
      <StatusBar barStyle="dark-content" />
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={onboardingSlides}
        renderItem={slideProps => <OnboardingSlide {...slideProps} />}
        ref={ref}
        sliderWidth={WIDTH}
        itemWidth={Math.round(WIDTH)}
        onScrollIndexChanged={(index: number) => {
          haptic('impactLight');
          setActiveSlideIndex(index);
        }}
        // @ts-ignore
        disableIntervalMomentum={true}
      />
      <CtaContainerAbsolute>
        <Row>
          <Column>
            <Pagination
              dotsLength={onboardingSlides.length}
              activeDotIndex={activeSlideIndex}
              tappableDots={true}
              carouselRef={ref}
              animatedDuration={100}
              animatedFriction={100}
              animatedTension={100}
              dotStyle={{
                backgroundColor: Action,
                width: 15,
                height: 15,
                borderRadius: 10,
                marginHorizontal: 1,
              }}
              inactiveDotOpacity={0.4}
              inactiveDotScale={0.5}
            />
          </Column>
          <Column>
            <Button
              buttonStyle={'primary'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Auth', {
                  screen: 'LoginSignup',
                  params: {context: 'signup'},
                });
              }}>
              Get Started
            </Button>
          </Column>
        </Row>
        <Row>
          <Button
            buttonType={'link'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Onboarding', {
                screen: 'Notifications',
              });
            }}>
            Continue without an account
          </Button>
        </Row>
      </CtaContainerAbsolute>
    </OnboardingContainer>
  );
};

export default OnboardingStart;
