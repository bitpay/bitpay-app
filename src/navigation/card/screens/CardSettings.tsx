import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import Animated, {
  Easing,
  FadeOutLeft,
  FadeOutRight,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import {SharedElement} from 'react-navigation-shared-element';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
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
import {throttle} from 'lodash';

export type CardSettingsParamList = {
  id: string;
};

type CardSettingsProps = NativeStackScreenProps<CardStackParamList, 'Settings'>;

const CardSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const CardSettingsView = styled.View`
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
  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
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

  const throttleOnActiveSlideChange = useMemo(
    () =>
      throttle((index: number) => {
        const nextCard = cardsToShow[Math.round(index)];

        if (nextCard.cardType) {
          setActiveCard(nextCard);
        }
        setActiveSlideIndex(Math.round(index));
      }, 300),
    [],
  );

  const onCardChange = (_: number, index: number) => {
    if (Math.round(index) !== activeSlideIndex) {
      throttleOnActiveSlideChange(index);
    }
  };

  const onVirtualPress = useCallback(() => {
    if (virtualCard) {
      setActiveCard(virtualCard);
      carouselRef.current?.scrollTo({index: 0});
    }
  }, [virtualCard]);

  const onPhysicalPress = useCallback(() => {
    if (physicalCard) {
      setActiveCard(physicalCard);
      carouselRef.current?.scrollTo({index: 1});
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
    <CardSettingsContainer>
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
        <Carousel
          loop={false}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 1,
            parallaxScrollingOffset: 0,
            parallaxAdjacentItemScale: 0.9,
          }}
          style={{
            width: WIDTH,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          autoFillData={false}
          vertical={false}
          width={CARD_WIDTH}
          height={CARD_WIDTH / 1.5}
          autoPlay={false}
          data={cardsToShow}
          ref={carouselRef}
          enabled={true}
          scrollAnimationDuration={1000}
          onProgressChange={onCardChange}
          renderItem={renderSettingsSlide}
        />
        <CardSettingsView>
          {cardsToShow.map(c => {
            const isActive = c.id === activeCard.id;
            const isVirtual = c.cardType === 'virtual';
            const delay = 0;
            const duration = 250;
            const easing = Easing.linear;

            const useTransition = cardsToShow.length > 1;
            const transitionEnter =
              useTransition && animationsEnabled
                ? isVirtual
                  ? SlideInLeft.duration(duration).delay(delay).easing(easing)
                  : SlideInRight.duration(duration).delay(delay).easing(easing)
                : undefined;

            const transitionLeave = useTransition
              ? isVirtual
                ? FadeOutLeft.duration(duration / 2)
                    .delay(0)
                    .easing(easing)
                : FadeOutRight.duration(duration / 2)
                    .delay(0)
                    .easing(easing)
              : undefined;

            return isActive ? (
              <Animated.View
                key={c.id}
                entering={transitionEnter}
                exiting={transitionLeave}>
                <SettingsList
                  card={c}
                  orderPhysical={isVirtual && !physicalCard}
                  navigation={navigation}
                />
              </Animated.View>
            ) : null;
          })}
        </CardSettingsView>
      </ScrollView>
    </CardSettingsContainer>
  );
};

export default CardSettings;
