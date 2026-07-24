import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import type {LayoutChangeEvent} from 'react-native';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import type {PanGesture} from 'react-native-gesture-handler';
import Carousel from 'react-native-reanimated-carousel';
import type {CarouselRenderItem} from 'react-native-reanimated-carousel';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainerAbsolute,
  HeaderRightContainer,
  isNarrowHeight,
  WIDTH,
} from '../../../components/styled/Containers';
import {Link} from '../../../components/styled/Text';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';
import OnboardingSlide, {
  OnboardingSlideItem,
} from '../components/OnboardingSlide';
import ScrollHint, {ScrollHintContainer} from '../components/ScrollHint';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import PaginationDots from '../../../components/pagination-dots/PaginationDots';
import {useSharedValue} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';

type OnboardingStartScreenProps = NativeStackScreenProps<
  OnboardingGroupParamList,
  OnboardingScreens.ONBOARDING_START
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
        style={{
          height: isNarrowHeight ? 165 : 247,
          width: isNarrowHeight ? 145 : 217,
        }}
        source={require('../../../../assets/img/onboarding/light/spend.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{
          height: isNarrowHeight ? 165 : 247,
          width: isNarrowHeight ? 145 : 217,
        }}
        source={require('../../../../assets/img/onboarding/dark/spend.png')}
      />
    ),
  },
  wallet: {
    light: (
      <OnboardingImage
        style={{
          height: isNarrowHeight ? 114 : 170,
          width: isNarrowHeight ? 147 : 220,
        }}
        source={require('../../../../assets/img/onboarding/light/wallet.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{
          height: isNarrowHeight ? 114 : 170,
          width: isNarrowHeight ? 147 : 220,
        }}
        source={require('../../../../assets/img/onboarding/dark/wallet.png')}
      />
    ),
  },
  swap: {
    light: (
      <OnboardingImage
        style={{
          height: isNarrowHeight ? 135 : 203,
          width: isNarrowHeight ? 140 : 210,
        }}
        source={require('../../../../assets/img/onboarding/light/swap.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{
          height: isNarrowHeight ? 135 : 203,
          width: isNarrowHeight ? 140 : 210,
        }}
        source={require('../../../../assets/img/onboarding/dark/swap.png')}
      />
    ),
  },
};

const styles = StyleSheet.create({
  onboardingContainer: {
    flex: 1,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  column: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginHorizontal: 5,
    flex: 1,
  },
  linkText: {
    fontWeight: '500',
    fontSize: 18,
  },
});

const Row = ({children}: {children: React.ReactNode}) => (
  <View style={styles.row}>{children}</View>
);

const Column = ({children}: {children: React.ReactNode}) => (
  <View style={styles.column}>{children}</View>
);

const LinkText = ({children}: {children: React.ReactNode}) => (
  <Link style={styles.linkText}>{children}</Link>
);

interface OnboardingCarouselProps {
  onboardingSlides: OnboardingSlideItem[];
  progressValue: SharedValue<number>;
  onSnapToItem: (index: number) => void;
}

const OnboardingCarousel = memo(function OnboardingCarousel({
  onboardingSlides,
  progressValue,
  onSnapToItem,
}: OnboardingCarouselProps) {
  const configurePanGesture = useCallback((gesture: PanGesture) => {
    gesture.activeOffsetX([-10, 10]);
  }, []);
  const renderItem = useCallback<CarouselRenderItem<OnboardingSlideItem>>(
    ({item}) => <OnboardingSlide item={item} />,
    [],
  );

  return (
    <Carousel
      loop={false}
      vertical={false}
      width={WIDTH}
      height={WIDTH * 1.2}
      autoPlay={false}
      data={onboardingSlides}
      pagingEnabled={true}
      snapEnabled={true}
      windowSize={2}
      scrollAnimationDuration={1000}
      onProgressChange={progressValue}
      onSnapToItem={onSnapToItem}
      onConfigurePanGesture={configurePanGesture}
      renderItem={renderItem}
    />
  );
});

const OnboardingStart = ({navigation}: OnboardingStartScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const themeType = useThemeType();
  const notificationsInteractionDone = useAppSelector(
    ({APP}) => APP.notificationsInteractionDone,
  );
  const pinInteractionDone = useAppSelector(({APP}) => APP.pinInteractionDone);
  const isPaired = useAppSelector(
    ({APP, BITPAY_ID}) => !!BITPAY_ID.apiToken[APP.network],
  );

  const preventAndroidBack = useCallback(() => true, []);
  useAndroidBackHandler(preventAndroidBack);

  const onLoginPress = useCallback(() => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Log In', {
        context: 'onboarding',
      }),
    );
    navigation.navigate('Login', {
      onLoginSuccess: async () => {
        haptic('impactLight');
        navigation.navigate('Notifications');
      },
    });
  }, [dispatch, navigation]);

  const onLogoutPress = useCallback(() => {
    haptic('impactLight');
    dispatch(BitPayIdEffects.startDisconnectBitPayId());
  }, [dispatch]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          {isPaired ? (
            <Button
              testID="log-out-button"
              accessibilityLabel="Log out"
              buttonType="pill"
              onPress={onLogoutPress}>
              {t('Log Out')}
            </Button>
          ) : (
            <Button
              testID="log-in-button"
              accessibilityLabel="Log in"
              buttonType={'pill'}
              onPress={onLoginPress}>
              {t('Log In')}
            </Button>
          )}
        </HeaderRightContainer>
      ),
    });
  }, [isPaired, navigation, onLoginPress, onLogoutPress, t]);

  const [scrollHintHeight, setScrollHintHeight] = useState(0);
  const progressValue = useSharedValue<number>(0);

  const onboardingSlides = useMemo<OnboardingSlideItem[]>(
    () => [
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
    ],
    [t, themeType],
  );

  const continueWithoutAnAccount = useCallback(() => {
    haptic('impactLight');
    if (!notificationsInteractionDone) {
      navigation.navigate('Notifications');
    } else if (!pinInteractionDone) {
      navigation.navigate('Pin');
    } else {
      navigation.navigate('CreateKey');
    }
  }, [navigation, notificationsInteractionDone, pinInteractionDone]);

  const onSnapToItem = useCallback(
    (index: number) => {
      dispatch(
        Analytics.track('Swiped Feature', {
          context: 'onboarding',
          pageSwiped: index + 1,
        }),
      );
    },
    [dispatch],
  );

  const onCtaLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height + 20;
    setScrollHintHeight(currentHeight =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, []);

  const onGetStartedPress = useCallback(() => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Get Started', {
        context: 'onboarding',
      }),
    );
    navigation.navigate('CreateAccount', {
      context: 'onboarding',
    });
  }, [dispatch, navigation]);

  const onContinuePress = useCallback(() => {
    dispatch(
      Analytics.track('Clicked Continue', {
        context: 'onboarding',
      }),
    );
    continueWithoutAnAccount();
  }, [continueWithoutAnAccount, dispatch]);

  const onContinueWithoutAccountPress = useCallback(() => {
    dispatch(
      Analytics.track('Clicked Continue without an account', {
        context: 'onboarding',
      }),
    );
    continueWithoutAnAccount();
  }, [continueWithoutAnAccount, dispatch]);

  return (
    <SafeAreaView
      edges={Platform.OS === 'ios' ? undefined : []}
      style={styles.onboardingContainer}
      testID="onboarding-start-view">
      <React.Profiler id="OnboardingStart:carousel" onRender={logReactProfiler}>
        <ScrollView scrollEnabled={isNarrowHeight}>
          <OnboardingCarousel
            onboardingSlides={onboardingSlides}
            progressValue={progressValue}
            onSnapToItem={onSnapToItem}
          />
          <View style={{height: scrollHintHeight}} />
        </ScrollView>
      </React.Profiler>

      <React.Profiler
        id="OnboardingStart:scroll-hint"
        onRender={logReactProfiler}>
        <ScrollHintContainer>
          <ScrollHint height={scrollHintHeight} />
        </ScrollHintContainer>
      </React.Profiler>

      <React.Profiler id="OnboardingStart:cta" onRender={logReactProfiler}>
        <CtaContainerAbsolute testID="cta-container" onLayout={onCtaLayout}>
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
                  testID="get-started-button"
                  accessibilityLabel="Get started"
                  buttonStyle={'primary'}
                  onPress={onGetStartedPress}>
                  {t('Get Started')}
                </Button>
              ) : (
                <Button
                  testID="continue-button"
                  accessibilityLabel="Continue"
                  buttonStyle={'primary'}
                  onPress={onContinuePress}>
                  {t('Continue')}
                </Button>
              )}
            </Column>
          </Row>
          {!isPaired ? (
            <Row>
              <ActionContainer>
                <Button
                  testID="continue-without-an-account-button"
                  accessibilityLabel="Continue without an account"
                  buttonType={'link'}
                  onPress={onContinueWithoutAccountPress}>
                  <LinkText>{t('Continue without an account')}</LinkText>
                </Button>
              </ActionContainer>
            </Row>
          ) : null}
        </CtaContainerAbsolute>
      </React.Profiler>
    </SafeAreaView>
  );
};

export default OnboardingStart;
