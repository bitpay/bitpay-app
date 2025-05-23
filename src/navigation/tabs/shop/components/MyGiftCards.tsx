import React, {useEffect, useRef, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';
import {CardConfig, GiftCard} from '../../../../store/shop/shop.models';
import {GiftCardScreens} from '../gift-card/GiftCardGroup';
import GiftCardCreditsItem from './GiftCardCreditsItem';
import {
  horizontalPadding,
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
} from './styled/ShopTabComponents';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {useAppSelector} from '../../../../utils/hooks';
import {
  isGiftCardDisplayable,
  sortByDescendingDate,
} from '../../../../lib/gift-cards/gift-card';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const MyGiftCardsHeaderContainer = styled(SectionHeaderContainer)`
  margin-bottom: -10px;
  padding-horizontal: 3px;
`;

const NoGiftCards = styled.View`
  border: 1px solid #f5f7f8;
  border-radius: 30px;
  align-items: center;
  justify-content: center;
  height: 50px;
  margin: 10px ${horizontalPadding}px;
`;

const NoGiftCardsText = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
`;

const giftCardHeight = 67;

const MyGiftCards = ({
  supportedGiftCards,
}: {
  supportedGiftCards: CardConfig[];
}) => {
  const {t} = useTranslation();
  const carouselRef = useRef<ICarouselInstance>(null);
  const navigation = useNavigation();
  const [slideIndex, setSlideIndex] = useState(0);
  const allGiftCards = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  ) as GiftCard[];
  const supportedGiftCardMap = supportedGiftCards.reduce(
    (map, cardConfig) => ({...map, ...{[cardConfig.name]: cardConfig}}),
    {} as {[name: string]: CardConfig},
  );
  const giftCards = allGiftCards
    .filter(giftCard => isGiftCardDisplayable(giftCard, supportedGiftCardMap))
    .sort(sortByDescendingDate);
  const activeGiftCards = giftCards.filter(giftCard => !giftCard.archived);
  const archivedGiftCards = giftCards.filter(giftCard => giftCard.archived);
  let slides = [activeGiftCards];
  const shouldShowArchivedSlide =
    archivedGiftCards.length <= activeGiftCards.length + 1;
  if (shouldShowArchivedSlide) {
    slides.push(archivedGiftCards);
  }

  const seeArchivedGiftCards = () => {
    shouldShowArchivedSlide
      ? setSlideIndex(1)
      : navigation.navigate(GiftCardScreens.ARCHIVED_GIFT_CARDS, {
          giftCards: archivedGiftCards,
          supportedGiftCardMap,
        });
  };

  useEffect(() => {
    if (!archivedGiftCards.length) {
      setTimeout(() => setSlideIndex(0), 500);
    }
  }, [archivedGiftCards.length]);

  useEffect(() => {
    setTimeout(
      () => carouselRef.current?.scrollTo({index: slideIndex, animated: true}),
      50,
    );
  }, [slideIndex]);

  const longestSlideLength = Math.max(...slides.map(slide => slide.length));
  const carouselHeight = longestSlideLength * giftCardHeight || 60;

  return (
    <>
      <SectionContainer>
        <MyGiftCardsHeaderContainer>
          <SectionHeader>
            {slideIndex === 0
              ? t('My Gift Cards')
              : t('My Archived Gift Cards')}
          </SectionHeader>
          {archivedGiftCards.length ? (
            <>
              {slideIndex === 0 ? (
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => seeArchivedGiftCards()}>
                  <SectionHeaderButton>{t('See Archived')}</SectionHeaderButton>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => setSlideIndex(0)}>
                  <SectionHeaderButton>{t('See Active')}</SectionHeaderButton>
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </MyGiftCardsHeaderContainer>
      </SectionContainer>
      <View style={{height: carouselHeight}}>
        <Carousel
          ref={carouselRef}
          loop={false}
          vertical={false}
          width={WIDTH}
          height={carouselHeight}
          autoPlay={false}
          data={slides}
          enabled={false}
          renderItem={({item}: {item: GiftCard[]; index: number}) => (
            <>
              {item.length ? (
                <>
                  {item.sort(sortByDescendingDate).map(giftCard => {
                    const cardConfig = supportedGiftCardMap[giftCard.name];
                    return (
                      cardConfig && (
                        <TouchableOpacity
                          style={{paddingHorizontal: horizontalPadding}}
                          activeOpacity={ActiveOpacity}
                          key={giftCard.invoiceId}
                          onPress={() => {
                            navigation.navigate(
                              GiftCardScreens.GIFT_CARD_DETAILS,
                              {
                                cardConfig,
                                giftCard,
                              },
                            );
                          }}>
                          <GiftCardCreditsItem
                            key={giftCard.invoiceId}
                            cardConfig={cardConfig}
                            amount={giftCard.amount}
                          />
                        </TouchableOpacity>
                      )
                    );
                  })}
                </>
              ) : (
                <NoGiftCards>
                  <NoGiftCardsText>
                    {t('You have no active gift cards.')}
                  </NoGiftCardsText>
                </NoGiftCards>
              )}
            </>
          )}
        />
      </View>
    </>
  );
};

export default MyGiftCards;
