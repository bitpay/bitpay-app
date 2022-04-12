import {useNavigation} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useRef, useState} from 'react';
import Carousel, {Pagination} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainerAbsolute,
  WIDTH,
} from '../../../components/styled/Containers';
import {Action} from '../../../styles/colors';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import OnboardingSlide from '../../onboarding/components/OnboardingSlide';
import {OnboardingImage} from '../../onboarding/components/Containers';
import {WalletStackParamList} from '../WalletStack';

type KeyExplanationScreenProps = StackScreenProps<
  WalletStackParamList,
  'KeyExplanation'
>;

// IMAGES
const KeyExplanationImages = {
  recoveryPhrase: {
    light: require('../../../../assets/img/key-explanation/light/recovery-phrase.png'),
    dark: require('../../../../assets/img/key-explanation/dark/recovery-phrase.png'),
  },
  safeCoins: {
    light: require('../../../../assets/img/key-explanation/light/safe-coins.png'),
    dark: require('../../../../assets/img/key-explanation/dark/safe-coins.png'),
  },
  walletSafety: {
    light: require('../../../../assets/img/key-explanation/light/wallet-safety.png'),
    dark: require('../../../../assets/img/key-explanation/dark/wallet-safety.png'),
  },
};

const KeyExplanationContainer = styled.SafeAreaView`
  flex: 1;
`;

const CarouselContainer = styled.SafeAreaView`
  margin-top: 30px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
`;

const KeyExplanation: React.FC<KeyExplanationScreenProps> = () => {
  const navigation = useNavigation();
  const themeType = useThemeType();
  const ref = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const keyExplanationSlides = [
    {
      title: 'Your funds, on your device',
      text: 'A wallet is like a vault stored on your device containing your crypto funds. Much like a vault, your wallet will only be accessible with the recovery phrase.',
      img: () => (
        <OnboardingImage
          widthPct={0.24}
          heightPct={0.21}
          source={KeyExplanationImages.recoveryPhrase[themeType]}
        />
      ),
    },
    {
      title: 'The recovery phrase',
      text: 'Your wallet recovery phrase is composed of 12 randomly selected words. If you ever lose or damage your device, you can re-gain access to your wallet as long as you have your 12-word recovery phrase.',
      img: () => (
        <OnboardingImage
          widthPct={0.24}
          heightPct={0.27}
          source={KeyExplanationImages.safeCoins[themeType]}
        />
      ),
    },
    {
      title: "Don't lose it!",
      text: 'In order to protect your funds from being accessible to hackers and thieves, the recovery phrase must be kept somewhere safe and remain a secret.',
      img: () => (
        <OnboardingImage
          widthPct={0.24}
          heightPct={0.2}
          source={KeyExplanationImages.walletSafety[themeType]}
        />
      ),
    },
  ];

  return (
    <KeyExplanationContainer>
      <CarouselContainer>
        <Carousel
          vertical={false}
          layout={'default'}
          useExperimentalSnap={true}
          data={keyExplanationSlides}
          renderItem={slideProps => <OnboardingSlide {...slideProps} />}
          ref={ref}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
          onScrollIndexChanged={(index: number) => {
            haptic('impactLight');
            setActiveSlideIndex(index);
          }}
          // @ts-ignore
          disableIntervalMomentum={true}
        />
      </CarouselContainer>
      <CtaContainerAbsolute>
        <Row>
          <Pagination
            dotsLength={keyExplanationSlides.length}
            activeDotIndex={activeSlideIndex}
            tappableDots={true}
            carouselRef={ref}
            animatedDuration={100}
            animatedFriction={100}
            animatedTension={100}
            dotStyle={{
              backgroundColor: Action,
              width: 15,
              height: 15,
              borderRadius: 10,
              marginHorizontal: 1,
            }}
            inactiveDotOpacity={0.4}
            inactiveDotScale={0.5}
          />
        </Row>
        <ActionContainer>
          <Button
            buttonStyle={'primary'}
            onPress={() => {
              haptic('impactLight');
              if (activeSlideIndex === 2) {
                navigation.goBack();
              } else {
                // @ts-ignore
                ref.current.snapToNext();
              }
            }}>
            {activeSlideIndex === 2 ? 'I understand' : 'Next'}
          </Button>
        </ActionContainer>
      </CtaContainerAbsolute>
    </KeyExplanationContainer>
  );
};

export default KeyExplanation;
