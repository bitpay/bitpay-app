import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';
import {Linking} from 'react-native';
import Braze, {ContentCard} from '@braze/react-native-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import {
  ActiveOpacity,
  ScreenGutter,
  WIDTH,
} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {
  Action,
  Black,
  LightBlack,
  LightBlue,
  Midnight,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useFocusEffect, useTheme} from '@react-navigation/native';
import MarketingCloseIcon from './MarketingCloseIcon';
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../../components/haptic-feedback/haptic';
import {useAppDispatch, useUrlEventHandler} from '../../../../utils/hooks';
import {AppActions, AppEffects} from '../../../../store/app';
import {LogActions} from '../../../../store/log';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../utils/braze';

const horizontalPadding = Number(ScreenGutter.replace('px', ''));
const cardWidth = WIDTH - horizontalPadding;
const cardHeight = 72;
const carouselScrollDuration = 500;

const CarouselItemContainer = styled.View`
  padding-left: ${horizontalPadding}px;
  padding-right: 0;
`;

type Slide = {
  card: ContentCard;
  title: string;
  subtitle: string;
  url?: string;
  openURLInWebView?: boolean;
  heroImage?: Source | null;
  backgroundColor?: string;
};

interface MarketingCarouselProps {
  contentCards: ContentCard[];
}

const MarketingCarousel: React.FC<MarketingCarouselProps> = ({
  contentCards,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedCardIds, setDismissedCardIds] = useState<string[]>([]);
  const skipNextCardPressRef = useRef(false);
  const dismissTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const theme = useTheme();
  const carouselRef = useRef<ICarouselInstance>(null);
  const dispatch = useAppDispatch();
  const urlEventHandler = useUrlEventHandler();
  const loggedImpressionsRef = useRef(new Set<string>());

  const slides = useMemo<Slide[]>(() => {
    const dismissedSet = new Set(dismissedCardIds);

    return contentCards
      .filter(card => {
        const cardId = card.id;
        return !cardId || !dismissedSet.has(cardId);
      })
      .map(card => {
        let title = '';
        let subtitle = '';

        if (isCaptionedContentCard(card)) {
          title = card.title || '';
          subtitle = card.cardDescription || '';
        } else if (isClassicContentCard(card)) {
          title = card.title || '';
          subtitle = card.cardDescription || '';
        }

        if (!title) {
          title = card.id;
        }

        let heroImage: Source | null = null;

        if (card.image) {
          heroImage =
            typeof card.image === 'string'
              ? {uri: card.image}
              : (card.image as Source);
        }

        return {
          card,
          title: title,
          subtitle: subtitle,
          url: card.url,
          openURLInWebView: card.openURLInWebView,
          heroImage,
        };
      })
      .filter(slide => slide.title);
  }, [contentCards, dismissedCardIds]);

  useEffect(() => {
    setActiveIndex(prevIndex => {
      if (!slides.length) {
        return 0;
      }

      return Math.min(prevIndex, slides.length - 1);
    });
  }, [slides.length]);

  useEffect(() => {
    return () => {
      dismissTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      dismissTimeoutsRef.current.clear();
    };
  }, []);

  const logImpression = useCallback((card: ContentCard) => {
    if (!card.id || card.id.startsWith('dev_')) {
      return;
    }

    if (loggedImpressionsRef.current.has(card.id)) {
      return;
    }

    loggedImpressionsRef.current.add(card.id);
    Braze.logContentCardImpression(card.id);
  }, []);

  useEffect(() => {
    const slide = slides[activeIndex];

    if (slide) {
      logImpression(slide.card);
    }
  }, [activeIndex, logImpression, slides]);

  useFocusEffect(
    useCallback(() => {
      const slide = slides[activeIndex];
      if (slide) {
        logImpression(slide.card);
      }
    }, [activeIndex, slides, logImpression]),
  );

  const handleSlidePress = useCallback(
    async (slide: Slide) => {
      const {card, url, openURLInWebView} = slide;

      if (!url) {
        return;
      }

      if (!card.id.startsWith('dev_')) {
        Braze.logContentCardClicked(card.id);
      }

      haptic('impactLight');

      try {
        const handled = await urlEventHandler({url});

        if (!handled) {
          if (url.startsWith(APP_DEEPLINK_PREFIX)) {
            Linking.openURL(url);
          } else if (openURLInWebView) {
            dispatch(AppEffects.openUrlWithInAppBrowser(url));
          } else {
            Linking.openURL(url);
          }
        }
      } catch (err) {
        dispatch(
          LogActions.debug('Failed to open marketing slide URL: ' + url),
        );
        dispatch(LogActions.debug(JSON.stringify(err)));
        Linking.openURL(url).catch(() => {
          dispatch(AppEffects.openUrlWithInAppBrowser(url));
        });
      }
    },
    [dispatch, urlEventHandler],
  );

  if (!slides.length) {
    return null;
  }

  return (
    <Container>
      <Carousel
        ref={carouselRef}
        onConfigurePanGesture={gestureChain => {
          gestureChain.activeOffsetX([-10, 10]);
          gestureChain.failOffsetY([-10, 10]);
        }}
        loop={false}
        vertical={false}
        width={cardWidth}
        height={cardHeight}
        autoPlay={false}
        style={{width: WIDTH}}
        data={slides}
        pagingEnabled
        snapEnabled
        scrollAnimationDuration={carouselScrollDuration}
        onProgressChange={(_, absoluteProgress) => {
          const nextIndex = Math.min(
            slides.length - 1,
            Math.max(0, Math.round(absoluteProgress)),
          );
          setActiveIndex(nextIndex);
        }}
        renderItem={({item, index}) => (
          <CarouselItemContainer>
            <CardContainer
              backgroundColor={
                item.backgroundColor || (theme.dark ? Midnight : LightBlue)
              }>
              <CardTouchable
                accessibilityRole={item.url ? 'button' : undefined}
                activeOpacity={ActiveOpacity}
                touchableLibrary="react-native"
                disabled={!item.url}
                onPress={() => {
                  if (skipNextCardPressRef.current) {
                    skipNextCardPressRef.current = false;
                    return;
                  }

                  handleSlidePress(item);
                }}
                accessibilityState={{disabled: !item.url}}>
                <CardRow>
                  {item.heroImage ? (
                    <HeroContainer>
                      <HeroImage
                        source={item.heroImage}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    </HeroContainer>
                  ) : null}
                  <CopyContainer>
                    <CardTitle numberOfLines={2}>{item.title}</CardTitle>
                    {item.subtitle ? (
                      <CardSubtitle numberOfLines={2}>
                        {item.subtitle}
                      </CardSubtitle>
                    ) : null}
                  </CopyContainer>
                </CardRow>
              </CardTouchable>
              <CloseButton
                activeOpacity={ActiveOpacity}
                accessibilityLabel="dismiss-marketing-carousel"
                onPressIn={() => {
                  skipNextCardPressRef.current = true;
                }}
                onPress={() => {
                  skipNextCardPressRef.current = true;
                  const cardId = item.card.id;

                  if (!cardId) {
                    return;
                  }

                  if (dismissTimeoutsRef.current.has(cardId)) {
                    return;
                  }

                  const targetIndex =
                    slides.length > 1 && index === slides.length - 1
                      ? Math.max(0, index - 1)
                      : index;

                  setActiveIndex(targetIndex);

                  if (targetIndex !== index) {
                    carouselRef.current?.scrollTo({
                      index: targetIndex,
                      animated: true,
                    });
                  }

                  const shouldDelay = targetIndex !== index;

                  const completeDismissal = () => {
                    if (!cardId.startsWith('dev_')) {
                      Braze.logContentCardDismissed(cardId);
                    }

                    dispatch(AppActions.dismissMarketingContentCard(cardId));
                    setDismissedCardIds(prev =>
                      prev.includes(cardId) ? prev : [...prev, cardId],
                    );
                  };

                  if (shouldDelay) {
                    const timeoutId = setTimeout(() => {
                      dismissTimeoutsRef.current.delete(cardId);
                      completeDismissal();
                    }, carouselScrollDuration);

                    dismissTimeoutsRef.current.set(cardId, timeoutId);
                  } else {
                    completeDismissal();
                  }
                }}>
                <MarketingCloseIcon />
              </CloseButton>
            </CardContainer>
          </CarouselItemContainer>
        )}
      />
      {slides.length > 1 ? (
        <DotsContainer>
          {slides.map((slide, index) => (
            <Dot
              key={slide.card.id || `marketing-slide-${index}`}
              active={index === activeIndex}
              accessibilityLabel={`marketing-carousel-slide-${index + 1}`}
              accessibilityRole="button"
              onPress={() => {
                if (index !== activeIndex) {
                  carouselRef.current?.scrollTo({index, animated: true});
                }
              }}
            />
          ))}
        </DotsContainer>
      ) : null}
    </Container>
  );
};

const Container = styled.View`
  padding-top: 10px;
  padding-bottom: 10px;
`;

const CardContainer = styled.View<{backgroundColor: string}>`
  background-color: ${({backgroundColor}) => backgroundColor};
  border-radius: 12px;
  height: ${cardHeight}px;
  flex-direction: row;
  align-items: center;
  padding-right: 16px;
`;

const CardTouchable = styled(TouchableOpacity)`
  flex: 1;
  padding: 16px;
`;

const CardRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeroContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 40px;
  margin-right: 8px;
  overflow: hidden;
`;

const HeroImage = styled(FastImage)`
  width: 40px;
  height: 40px;
`;

const CopyContainer = styled.View`
  flex: 1;
  margin-right: 12px;
  margin-left: 2px;
`;

const CardTitle = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : Black)};
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 18px;
`;

const CardSubtitle = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  margin-top: 4px;
`;

const CloseButton = styled.TouchableOpacity.attrs({
  hitSlop: {top: 12, bottom: 12, left: 12, right: 12},
})`
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const DotsContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-top: 14px;
`;

const Dot = styled.TouchableOpacity.attrs({
  activeOpacity: ActiveOpacity,
  hitSlop: {top: 8, bottom: 8, left: 8, right: 8},
})<{active: boolean}>`
  height: 8px;
  border-radius: 4px;
  margin: 0 4px;
  width: ${({active}) => (active ? 20 : 8)}px;
  background-color: ${({active, theme}) =>
    active ? Action : theme.dark ? LightBlack : NeutralSlate};
`;

export default MarketingCarousel;
