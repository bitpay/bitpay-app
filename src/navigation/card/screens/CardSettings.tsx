import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
// import Animated, {
//   Easing,
//   FadeOutLeft,
//   FadeOutRight,
//   SlideInLeft,
//   SlideInRight,
// } from 'react-native-reanimated';
import Carousel from 'react-native-snap-carousel';
import {SharedElement} from 'react-navigation-shared-element';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {CARD_WIDTH} from '../../../constants/config.card';
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
  justify-content: center;
  margin-bottom: ${ScreenGutter};
`;

const CardTypeButtons = styled.View`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
`;

const CardSettings: React.FC<CardSettingsProps> = ({navigation, route}) => {
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>();
  useEffect(() => {
    setAnimationsEnabled(true);
  }, []);
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
  }, [currentGroup]);

  const initialIdx = Math.max(
    0,
    cardsToShow.findIndex(c => c.id === id),
  );
  const [activeCard, setActiveCard] = useState(cardsToShow[initialIdx]);

  const onCardChange = (idx: number) => {
    const nextCard = cardsToShow[idx];

    if (nextCard.cardType) {
      setActiveCard(nextCard);
    }
  };

  const onVirtualPress = useCallback(() => {
    if (virtualCard) {
      setActiveCard(virtualCard);
      carouselRef.current?.snapToItem(0);
    }
  }, [virtualCard]);

  const onPhysicalPress = useCallback(() => {
    if (physicalCard) {
      setActiveCard(physicalCard);
      carouselRef.current?.snapToItem(1);
    }
  }, [physicalCard]);

  const goToCardHome = () => {
    navigation.navigate('CardHome', {
      id: id,
    });
  };
  const goToCardHomeRef = useRef(goToCardHome);
  goToCardHomeRef.current = goToCardHome;

  const renderSettingsSlide = useCallback(
    ({item}: {item: Card}) => (
      <SharedElement id={'card.dashboard.active-card.' + item.id}>
        <View>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => goToCardHomeRef.current()}>
            <SettingsSlide card={item} />
          </TouchableOpacity>
        </View>
      </SharedElement>
    ),
    [],
  );

  return (
    <ScrollView>
      <CardSettingsContainer>
        <CardSettingsHeader>
          {virtualCard && physicalCard ? (
            <CardTypeButtons>
              <Button
                onPress={onVirtualPress}
                buttonType="pill"
                buttonStyle={
                  activeCard.cardType === 'virtual' ? 'primary' : 'secondary'
                }>
                {t('Virtual')}
              </Button>

              <Button
                onPress={onPhysicalPress}
                buttonType="pill"
                buttonStyle={
                  activeCard.cardType === 'physical' ? 'primary' : 'secondary'
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
        itemWidth={CARD_WIDTH}
        sliderWidth={WIDTH}
        renderItem={renderSettingsSlide}
        onScrollIndexChanged={onCardChange}
        layout="default"
      />

      <CardSettingsContainer>
        {cardsToShow.map(c => {
          const isActive = c.id === activeCard.id;
          const isVirtual = c.cardType === 'virtual';
          const delay = 0;
          const duration = 250;
          // const easing = Easing.linear;

          const useTransition = cardsToShow.length > 1;
          // const transitionEnter =
          //   useTransition && animationsEnabled
          //     ? isVirtual
          //       ? SlideInLeft.duration(duration).delay(delay).easing(easing)
          //       : SlideInRight.duration(duration).delay(delay).easing(easing)
          //     : undefined;

          // const transitionLeave = useTransition
          //   ? isVirtual
          //     ? FadeOutLeft.duration(duration / 2)
          //         .delay(0)
          //         .easing(easing)
          //     : FadeOutRight.duration(duration / 2)
          //         .delay(0)
          //         .easing(easing)
          //   : undefined;

          return  null;
        })}
      </CardSettingsContainer>
    </ScrollView>
  );
};

export default CardSettings;
