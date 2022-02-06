import React, {useEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import IntroButton from '../components/intro-button/IntroButton';
// light
import LightKeySvg from '../../../../assets/img/intro/light/key.svg';
import LightEthSvg from '../../../../assets/img/intro/light/eth-wallet.svg';
import LightCreateKeySvg from '../../../../assets/img/intro/light/create-key.svg';
import LightCardSvg from '../../../../assets/img/intro/light/card.svg';
const lightBackground = require('../../../../assets/img/intro/light/home-background.png');
const lightCardsList = [
  <LightKeySvg />,
  <LightEthSvg />,
  <LightCardSvg />,
  <LightCreateKeySvg />,
];
// dark
import DarkKeySvg from '../../../../assets/img/intro/dark/key.svg';
import DarkEthSvg from '../../../../assets/img/intro/dark/eth-key.svg';
import DarkCreateKeySvg from '../../../../assets/img/intro/dark/create-key.svg';
import DarkCardSvg from '../../../../assets/img/intro/dark/card.svg';
const darkBackground = require('../../../../assets/img/intro/dark/home-background.png');
const darkCardsList = [
  <DarkKeySvg />,
  <DarkEthSvg />,
  <DarkCardSvg />,
  <DarkCreateKeySvg />,
];

import {
  BackgroundImage,
  Body,
  IntroText,
  IntroTextBold,
  ButtonContainer,
  Overlay,
} from '../components/styled/Styled';
import {WIDTH} from '../../../components/styled/Containers';
import Carousel from 'react-native-snap-carousel';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {sleep} from '../../../utils/helper-methods';
import {useNavigation, useTheme} from '@react-navigation/native';
import debounce from 'lodash.debounce';

const IntroWalletContainer = styled.View`
  flex: 1;
  background: ${({theme}) => theme.colors.background};
`;

const CarouselContainer = styled.View`
  margin-top: 100px;
`;

const BodyTextContainer = styled.View`
  margin: 20px 0;
  padding: 0 30px;
  justify-content: center;
  align-items: center;
`;

const Steps = [
  {
    description: 'All of your assets will \n now live on your',
    focus: 'Home Tab',
  },
  {},
  {
    description:
      'You can also view your BitPay card, gift cards, and create new keys.',
    focus: '',
  },
];

const IntroWallet = () => {
  const ref = useRef(null);
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const fade = useSharedValue(1);
  const x = useSharedValue(0);
  const fadeAndTranslateXStyle = useAnimatedStyle(() => {
    return {
      opacity: fade.value,
      transform: [{translateX: x.value}],
    };
  });

  useEffect(() => {
    x.value = withTiming(0, {duration: 300});
    fade.value = withTiming(1, {duration: 300});
  }, []);

  const navigation = useNavigation();
  return (
    <IntroWalletContainer>
      <BackgroundImage source={theme.dark ? darkBackground : lightBackground} />
      <Overlay />
      <Body>
        <CarouselContainer>
          <Carousel
            contentContainerCustomStyle={{marginLeft: '10%'}}
            vertical={false}
            layout={'default'}
            useExperimentalSnap={true}
            ref={ref}
            data={theme.dark ? darkCardsList : lightCardsList}
            renderItem={({item}) => item}
            sliderWidth={WIDTH}
            itemWidth={235}
            activeSlideAlignment={'center'}
            onScrollIndexChanged={async index => {
              setStep(index);
              await sleep(0);
              x.value = withTiming(0, {duration: 300});
              fade.value = withTiming(1, {duration: 300});
            }}
            scrollEnabled={false}
            inactiveSlideScale={1}
            inactiveSlideOpacity={1}
          />
        </CarouselContainer>
        <Animated.View style={fadeAndTranslateXStyle}>
          <BodyTextContainer>
            <IntroText>{Steps[step]?.description}</IntroText>
            <IntroTextBold>{Steps[step]?.focus}</IntroTextBold>
          </BodyTextContainer>
        </Animated.View>
        <ButtonContainer>
          <IntroButton
            onPress={debounce(async () => {
              if (step < 1) {
                x.value = withTiming(50, {duration: 300});
                fade.value = withTiming(0, {duration: 300});
                await sleep(300);
                x.value = -50;
                // @ts-ignore
                ref.current.snapToItem(2);
              } else {
                navigation.navigate('Intro', {screen: 'Shop'});
              }
            }, 300)}
          />
        </ButtonContainer>
      </Body>
    </IntroWalletContainer>
  );
};

export default IntroWallet;
