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
import {useTranslation} from 'react-i18next';

type KeyExplanationScreenProps = StackScreenProps<
  WalletStackParamList,
  'KeyExplanation'
>;

// IMAGES
const KeyExplanationImages = {
  recoveryPhrase: {
    light: (
      <OnboardingImage
        style={{width: 205, height: 210}}
        source={require('../../../../assets/img/key-explanation/light/recovery-phrase.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{width: 200, height: 210}}
        source={require('../../../../assets/img/key-explanation/dark/recovery-phrase.png')}
      />
    ),
  },
  safeCoins: {
    light: (
      <OnboardingImage
        style={{width: 247, height: 225}}
        source={require('../../../../assets/img/key-explanation/light/safe-coins.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{width: 247, height: 190}}
        source={require('../../../../assets/img/key-explanation/dark/safe-coins.png')}
      />
    ),
  },
  walletSafety: {
    light: (
      <OnboardingImage
        style={{width: 205, height: 210}}
        source={require('../../../../assets/img/key-explanation/light/wallet-safety.png')}
      />
    ),
    dark: (
      <OnboardingImage
        style={{width: 180, height: 210}}
        source={require('../../../../assets/img/key-explanation/dark/wallet-safety.png')}
      />
    ),
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
  const {t} = useTranslation();
  const navigation = useNavigation();
  const themeType = useThemeType();
  const ref = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const keyExplanationSlides = [
    {
      title: t('Your funds, on your device'),
      text: t(
        'A wallet is like a vault stored on your device containing your crypto funds. Much like a vault, your wallet will only be accessible with the recovery phrase.',
      ),
      img: () => KeyExplanationImages.safeCoins[themeType],
    },
    {
      title: t('The recovery phrase'),
      text: t(
        'Your wallet recovery phrase is composed of 12 randomly selected words. If you ever lose or damage your device, you can re-gain access to your wallet as long as you have your 12-word recovery phrase.',
      ),
      img: () => KeyExplanationImages.recoveryPhrase[themeType],
    },
    {
      title: t("Don't lose it!"),
      text: t(
        'In order to protect your funds from being accessible to hackers and thieves, the recovery phrase must be kept somewhere safe and remain a secret.',
      ),
      img: () => KeyExplanationImages.walletSafety[themeType],
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
              if (activeSlideIndex === keyExplanationSlides.length - 1) {
                navigation.goBack();
              } else {
                // @ts-ignore
                ref.current.snapToNext();
              }
            }}>
            {activeSlideIndex === keyExplanationSlides.length - 1
              ? t('I Understand')
              : t('Next')}
          </Button>
        </ActionContainer>
      </CtaContainerAbsolute>
    </KeyExplanationContainer>
  );
};

export default KeyExplanation;
