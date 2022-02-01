import React, {useRef, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import {CardConfig, GiftCard} from '../../../../store/shop/shop.models';
import {GiftCardScreens} from '../gift-card/GiftCardStack';
import GiftCardCreditsItem from './GiftCardCreditsItem';
import {
  horizontalPadding,
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
} from './styled/ShopTabComponents';
import {WIDTH} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {SlateDark} from '../../../../styles/colors';

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
  margin-top: 10px;
`;

const NoGiftCardsText = styled(BaseText)`
  color: ${SlateDark};
`;

const MyGiftCards = ({
  giftCards,
  supportedGiftCards,
}: {
  giftCards: GiftCard[];
  supportedGiftCards: CardConfig[];
}) => {
  const carouselRef = useRef<Carousel<GiftCard[]>>(null);
  const navigation = useNavigation();
  const [slideIndex, setSlideIndex] = useState(0);
  const activeGiftCards = giftCards.filter(giftCard => !giftCard.archived);
  const archivedGiftCards = giftCards.filter(giftCard => giftCard.archived);
  let slides = [activeGiftCards];
  if (archivedGiftCards.length <= activeGiftCards.length) {
    slides.push(archivedGiftCards);
  }

  const goToSlide = (ind: number) => {
    carouselRef.current?.snapToItem(ind);
    setSlideIndex(ind);
  };

  const seeArchivedGiftCards = () => {
    archivedGiftCards.length <= activeGiftCards.length
      ? goToSlide(1)
      : navigation.navigate('GiftCard', {
          screen: GiftCardScreens.ARCHIVED_GIFT_CARDS,
          params: {
            giftCards: archivedGiftCards,
            supportedGiftCards,
          },
        });
  };

  return (
    <>
      <SectionContainer>
        <MyGiftCardsHeaderContainer>
          <SectionHeader>
            {slideIndex === 0 ? 'My Gift Cards' : 'My Archived Gift Cards'}
          </SectionHeader>
          {archivedGiftCards.length ? (
            <>
              {slideIndex === 0 ? (
                <TouchableWithoutFeedback
                  onPress={() => {
                    seeArchivedGiftCards();
                  }}>
                  <SectionHeaderButton>See Archived</SectionHeaderButton>
                </TouchableWithoutFeedback>
              ) : (
                <TouchableWithoutFeedback
                  onPress={() => {
                    carouselRef.current?.snapToItem(0);
                    setSlideIndex(0);
                  }}>
                  <SectionHeaderButton>See Active</SectionHeaderButton>
                </TouchableWithoutFeedback>
              )}
            </>
          ) : null}
        </MyGiftCardsHeaderContainer>
      </SectionContainer>
      <Carousel
        ref={carouselRef}
        vertical={false}
        layout={'default'}
        useExperimentalSnap={false}
        data={slides}
        inactiveSlideOpacity={1}
        inactiveSlideScale={1}
        activeSlideAlignment={'start'}
        sliderWidth={WIDTH}
        itemWidth={WIDTH}
        scrollEnabled={false}
        slideStyle={{paddingHorizontal: horizontalPadding}}
        // @ts-ignore
        disableIntervalMomentum={true}
        renderItem={(item: {dataIndex: number; item: GiftCard[]}) => (
          <>
            {item.item.length ? (
              <>
                {item.item
                  .sort((a, b) => parseInt(b.date, 10) - parseInt(a.date, 10))
                  .map(giftCard => {
                    const cardConfig = supportedGiftCards.find(
                      config => config.name === giftCard.name,
                    );
                    return (
                      cardConfig && (
                        <TouchableWithoutFeedback
                          key={giftCard.invoiceId}
                          onPress={() => {
                            navigation.navigate('GiftCard', {
                              screen: GiftCardScreens.GIFT_CARD_DETAILS,
                              params: {
                                cardConfig,
                                giftCard,
                              },
                            });
                          }}>
                          <GiftCardCreditsItem
                            key={giftCard.invoiceId}
                            cardConfig={cardConfig}
                            amount={giftCard.amount}
                          />
                        </TouchableWithoutFeedback>
                      )
                    );
                  })}
              </>
            ) : (
              <NoGiftCards>
                <NoGiftCardsText>
                  You have no active gift cards.
                </NoGiftCardsText>
              </NoGiftCards>
            )}
          </>
        )}
      />
    </>
  );
};

export default MyGiftCards;
