import React, {useEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import IntroButton from '../components/intro-button/IntroButton';
import WalletSvg from '../../../../assets/img/intro/wallet.svg';
import EthWalletSvg from '../../../../assets/img/intro/eth-wallet.svg';
import CreateWalletSvg from '../../../../assets/img/intro/create-wallet.svg';
import CardSvg from '../../../../assets/img/intro/card.svg';
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
import {useNavigation} from '@react-navigation/native';
import debounce from 'lodash.debounce';

const IntroWalletContainer = styled.View`
  flex: 1;
`;

const CarouselContainer = styled.View`
  margin-top: 25%;
`;

const BodyTextContainer = styled.View`
  margin-top: 20px;
  justify-content: center;
  align-items: center;
`;

const Steps = [
  {
    description: 'All of your assets will \n now live on your',
    focus: 'Home Tab',
  },
  {
    description: 'Also, your Keys have been renamed to',
    focus: 'Wallets',
  },
  {
    description: 'Add assets on your',
    focus: 'Home Tab',
  },
];

const IntroWallet = () => {
  const ref = useRef(null);
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

  const cardsList = [
    <WalletSvg />,
    <EthWalletSvg />,
    <CreateWalletSvg />,
    <CardSvg />,
  ];
  return (
    <IntroWalletContainer>
      <BackgroundImage
        source={require('../../../../assets/img/intro/light/wallet-background.png')}
      />
      <Overlay />
      <Body>
        <CarouselContainer>
          <Carousel
            contentContainerCustomStyle={{marginLeft: '25%'}}
            vertical={false}
            layout={'default'}
            useExperimentalSnap={true}
            ref={ref}
            data={cardsList}
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
            <IntroText>{Steps[step].description}</IntroText>
            <IntroTextBold>{Steps[step].focus}</IntroTextBold>
          </BodyTextContainer>
        </Animated.View>
        <ButtonContainer>
          <IntroButton
            onPress={debounce(async () => {
              if (step < 2) {
                x.value = withTiming(50, {duration: 300});
                fade.value = withTiming(0, {duration: 300});
                await sleep(300);
                x.value = -50;
                // @ts-ignore
                ref.current.snapToNext();
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
