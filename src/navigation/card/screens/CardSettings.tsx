import {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';
import Carousel from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {Card} from '../../../store/card/card.models';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {useAppSelector} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';
import SettingsList from '../components/CardSettingsList';
import SettingsSlide from '../components/CardSettingsSlide';

export type CardSettingsParamList = {
  id: string;
};

type CardSettingsProps = StackScreenProps<CardStackParamList, 'Settings'>;

const CardSettingsContainer = styled.View`
  padding: 0 ${ScreenGutter} ${ScreenGutter};
`;

const CardSettingsHeader = styled.View`
  align-content: center;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: ${ScreenGutter};
`;

const CardTypeButtons = styled.View`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
`;

const renderSettingsSlide = ({item}: {item: Card}) => (
  <SettingsSlide card={item} />
);

const CardSettings: React.FC<CardSettingsProps> = ({navigation, route}) => {
  const {id} = route.params;
  const {t} = useTranslation();
  const carouselRef = useRef<Carousel<Card>>(null);
  const currentGroup = useAppSelector(selectCardGroups).find(g =>
    g.some(c => c.id === id),
  );
  const [cardsToShow, virtualCard, physicalCard] = useMemo(() => {
    const cards: Card[] = [];
    let virtual: Card | undefined;
    let physical: Card | undefined;

    if (currentGroup) {
      virtual = currentGroup.find(c => c.cardType === 'virtual');
      physical = currentGroup.find(c => c.cardType === 'physical');

      if (virtual) {
        cards.push(virtual);
      }

      if (physical) {
        cards.push(physical);
      }
    }

    return [cards, virtual, physical];
  }, [currentGroup, id]);

  const currentCard = cardsToShow.find(c => c.id === id);
  const initialIdx = Math.max(
    0,
    cardsToShow.findIndex(c => c.id === id),
  );

  const onCardChange = (idx: number) => {
    const nextId = cardsToShow[idx].id;

    navigation.setParams({id: nextId});
  };

  return (
    <ScrollView>
      <CardSettingsContainer>
        <CardSettingsHeader>
          {virtualCard && physicalCard ? (
            <CardTypeButtons>
              <Button
                onPress={() => {
                  navigation.setParams({id: virtualCard.id});
                  carouselRef.current?.snapToItem(0);
                }}
                buttonType="pill"
                buttonStyle={
                  currentCard?.cardType === 'virtual' ? 'primary' : 'secondary'
                }>
                {t('Virtual')}
              </Button>

              <Button
                onPress={() => {
                  navigation.setParams({id: physicalCard.id});
                  carouselRef.current?.snapToItem(1);
                }}
                buttonType="pill"
                buttonStyle={
                  currentCard?.cardType === 'physical' ? 'primary' : 'secondary'
                }>
                {t('Physical')}
              </Button>
            </CardTypeButtons>
          ) : null}
        </CardSettingsHeader>
      </CardSettingsContainer>

      <Carousel<Card>
        ref={carouselRef}
        data={cardsToShow}
        vertical={false}
        firstItem={initialIdx}
        itemWidth={300 + 20}
        sliderWidth={WIDTH}
        renderItem={renderSettingsSlide}
        onScrollIndexChanged={onCardChange}
        layout="default"
      />

      <CardSettingsContainer>
        {currentCard ? (
          <SettingsList card={currentCard} navigation={navigation} />
        ) : null}
      </CardSettingsContainer>
    </ScrollView>
  );
};

export default CardSettings;
