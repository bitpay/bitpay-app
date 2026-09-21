import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import type {
  LayoutChangeEvent,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
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
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import PerformanceProfiler from '../../../components/performance/PerformanceProfiler';
import {Action, LuckySevens} from '../../../styles/colors';

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
  carousel: {
    width: WIDTH,
    height: WIDTH * 1.2,
  },
  carouselPage: {
    width: WIDTH,
  },
  pagination: {
    flexDirection: 'row',
    height: 30,
  },
  paginationDot: {
    backgroundColor: LuckySevens,
    borderRadius: 5,
    height: 10,
    margin: 10,
    width: 10,
  },
  paginationActiveDot: {
    backgroundColor: Action,
    borderRadius: 5,
    height: 10,
    left: 10,
    position: 'absolute',
    top: 10,
    width: 10,
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

const PAGINATION_DOT_STEP = 30;

const OnboardingPagination = memo(
  ({
    progressValue,
    length,
  }: {
    progressValue: SharedValue<number>;
    length: number;
  }) => {
    const activeDotStyle = useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX: interpolate(
              progressValue.value,
              [0, length - 1],
              [0, PAGINATION_DOT_STEP * (length - 1)],
              Extrapolate.CLAMP,
            ),
          },
        ],
      }),
      [length, progressValue],
    );

    return (
      <View style={styles.pagination}>
        {Array.from({length}, (_, index) => (
          <View
            key={index}
            testID={`pagination-button-${index}`}
            accessibilityLabel="Pagination button"
            style={styles.paginationDot}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[styles.paginationActiveDot, activeDotStyle]}
        />
      </View>
    );
  },
);

const onboardingSlideKeyExtractor = (
  _item: OnboardingSlideItem,
  index: number,
) => index.toString();

const getOnboardingSlideLayout = (
  _data: ArrayLike<OnboardingSlideItem> | null | undefined,
  index: number,
) => ({
  length: WIDTH,
  offset: WIDTH * index,
  index,
});

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
  const currentIndexRef = useRef(0);
  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<OnboardingSlideItem>) => (
      <View style={styles.carouselPage}>
        <OnboardingSlide item={item} />
      </View>
    ),
    [],
  );
  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: event => {
        progressValue.value = event.contentOffset.x / WIDTH;
      },
    },
    [progressValue],
  );
  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.max(
        0,
        Math.min(
          onboardingSlides.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / WIDTH),
        ),
      );
      if (nextIndex !== currentIndexRef.current) {
        currentIndexRef.current = nextIndex;
        onSnapToItem(nextIndex);
      }
    },
    [onSnapToItem, onboardingSlides.length],
  );

  return (
    <Animated.FlatList
      style={styles.carousel}
      data={onboardingSlides}
      horizontal={true}
      pagingEnabled={true}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={1}
      maxToRenderPerBatch={1}
      windowSize={3}
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={onMomentumScrollEnd}
      keyExtractor={onboardingSlideKeyExtractor}
      getItemLayout={getOnboardingSlideLayout}
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
      <PerformanceProfiler
        id="OnboardingStart:carousel"
        onRender={logReactProfiler}>
        <ScrollView scrollEnabled={isNarrowHeight}>
          <OnboardingCarousel
            onboardingSlides={onboardingSlides}
            progressValue={progressValue}
            onSnapToItem={onSnapToItem}
          />
          <View style={{height: scrollHintHeight}} />
        </ScrollView>
      </PerformanceProfiler>

      <PerformanceProfiler
        id="OnboardingStart:scroll-hint"
        onRender={logReactProfiler}>
        <ScrollHintContainer pointerEvents="none">
          <ScrollHint height={scrollHintHeight} />
        </ScrollHintContainer>
      </PerformanceProfiler>

      <PerformanceProfiler id="OnboardingStart:cta" onRender={logReactProfiler}>
        <CtaContainerAbsolute testID="cta-container" onLayout={onCtaLayout}>
          <Row>
            <Column>
              <Row>
                <OnboardingPagination
                  progressValue={progressValue}
                  length={onboardingSlides.length}
                />
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
      </PerformanceProfiler>
    </SafeAreaView>
  );
};

export default OnboardingStart;
