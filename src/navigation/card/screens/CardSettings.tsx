import {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {Card} from '../../../store/card/card.models';
import {buildCardNumber} from '../../../utils/card';
import {CardStackParamList} from '../CardStack';
import CardBack from '../components/CardBack';
import {OverviewSlide} from '../components/CardDashboard';
import SettingsList from '../components/CardSettingsList';

export type CardSettingsParamList = {
  slide: OverviewSlide;
  id?: string | null | undefined;
};

type CardSettingsProps = StackScreenProps<CardStackParamList, 'Settings'>;

const CardSettingsContainer = styled.View`
  padding: ${ScreenGutter};
`;

const CardSettingsHeader = styled.View`
  align-content: center;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const CardTypeButtons = styled.View`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
`;

/**
 * Builds an array of 1-2 cards to display in the settings screen. Settings will display at most 1 virtual and 1 physical card at a time.
 * @param cards Cards to use as input data.
 * @returns Array of 1-2 Cards to display on the Settings screen.
 */
const buildSettingsSlides = (cards: Card[]) => {
  const slides: Card[] = [];

  const virtual = cards.find(c => c.cardType === 'virtual');
  const physical = cards.find(c => c.cardType === 'physical');

  if (virtual) {
    slides.push(virtual);
  }

  if (physical) {
    slides.push(physical);
  }

  return slides;
};

const CardSettings: React.FC<CardSettingsProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const carouselRef = useRef<Carousel<Card>>(null);
  const {slide, id} = route.params;
  const memoizedCards = useMemo(
    () => buildSettingsSlides(slide.cards),
    [slide.cards],
  );
  const [initialSlideIdx] = useState(() => {
    return id
      ? Math.max(
          0,
          memoizedCards.findIndex(c => c.id === id),
        )
      : 0;
  });

  const activeCard =
    (id && memoizedCards.find(c => c.id === id)) ||
    memoizedCards[initialSlideIdx];

  const onCardChange = (idx: number) => {
    const nextId = memoizedCards[idx].id;

    navigation.setParams({id: nextId});
  };

  return (
    <ScrollView>
      <CardSettingsContainer>
        <CardSettingsHeader>
          {memoizedCards.length === 2 ? (
            <CardTypeButtons>
              <Button
                onPress={() => {
                  navigation.setParams({id: memoizedCards[0].id});
                  carouselRef.current?.snapToItem(0);
                }}
                buttonType="pill"
                buttonStyle={
                  activeCard?.cardType === 'virtual' ? 'primary' : 'secondary'
                }>
                {t('Virtual')}
              </Button>

              <Button
                onPress={() => {
                  navigation.setParams({id: memoizedCards[1].id});
                  carouselRef.current?.snapToItem(1);
                }}
                buttonType="pill"
                buttonStyle={
                  activeCard?.cardType === 'physical' ? 'primary' : 'secondary'
                }>
                {t('Physical')}
              </Button>
            </CardTypeButtons>
          ) : null}
        </CardSettingsHeader>

        <Carousel<Card>
          ref={carouselRef}
          data={memoizedCards}
          vertical={false}
          firstItem={initialSlideIdx}
          itemWidth={300 + 20}
          sliderWidth={WIDTH}
          renderItem={({item}) => {
            return (
              <CardBack
                brand={item.brand || 'Visa'}
                cardNumber={buildCardNumber(item.lastFourDigits)}
                cvv={''}
                nickname={item.nickname}
                expiration={''}
              />
            );
          }}
          onScrollIndexChanged={idx => onCardChange(idx)}
          layout="default"
        />

        <SettingsList card={activeCard} navigation={navigation} />
      </CardSettingsContainer>
    </ScrollView>
  );
};

export default CardSettings;
