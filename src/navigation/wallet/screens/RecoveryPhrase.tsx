import React, {useEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {
  BaseText,
  H2,
  H3,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {
  CtaContainer,
  HeaderTitleContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {Air, ProgressBlue} from '../../../styles/colors';
import Carousel from 'react-native-snap-carousel';
import {sleep} from '../../../utils/helper-methods';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {Platform} from 'react-native';

export interface RecoveryPhraseProps {
  keyId: string;
  words: string[];
}

const RecoveryPhraseContainer = styled.View`
  flex: 1;
`;

export const ProgressBarContainer = styled.View`
  padding: 10px 0;
`;

export const BodyContainer = styled.View`
  margin-top: 50px;
`;

export const DirectionsContainer = styled.View`
  padding: 0 10px 10px 10px;
`;

export const WordContainer = styled.View`
  background: ${Air};
  justify-content: center;
  align-items: center;
  height: 200px;
  margin: 0 30px;
`;

export const CountTracker = styled.View`
  padding: 10px;
  width: 100%;
`;

export const CountText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: 0.5px;
  text-align: center;
`;

const RecoveryPhrase = () => {
  useAndroidBackHandler(() => true);
  const ref = useRef(null);
  const navigation = useNavigation();
  const {
    params: {keyId, words},
  } = useRoute<RouteProp<{params: RecoveryPhraseProps}>>();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    return navigation.addListener('blur', async () => {
      await sleep(400);
      setActiveSlideIndex(0);
      // @ts-ignore
      ref.current.snapToItem(0);
    });
  }, [navigation]);

  return (
    <RecoveryPhraseContainer>
      <HeaderTitleContainer>
        <TextAlign align={'left'}>
          <H3>Recovery Phrase</H3>
        </TextAlign>
      </HeaderTitleContainer>
      <ProgressBarContainer>
        <Progress.Bar
          progress={0.3}
          width={null}
          color={ProgressBlue}
          unfilledColor={Air}
          borderColor={Air}
          borderWidth={0}
          borderRadius={0}
        />
      </ProgressBarContainer>

      <BodyContainer>
        <DirectionsContainer>
          <TextAlign align={'center'}>
            <Paragraph>Write down each word.</Paragraph>
          </TextAlign>
        </DirectionsContainer>
        <Carousel
          vertical={false}
          layout={'stack'}
          layoutCardOffset={12}
          useExperimentalSnap={true}
          data={words}
          renderItem={({item: word}: {item: string}) => {
            return (
              <WordContainer>
                <H2>{word}</H2>
              </WordContainer>
            );
          }}
          ref={ref}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
          onScrollIndexChanged={(index: number) => {
            setActiveSlideIndex(index);
          }}
          scrollEnabled={false}
          // @ts-ignore
          disableIntervalMomentum={true}
        />
        <CountTracker>
          <CountText>{activeSlideIndex + 1}/12</CountText>
        </CountTracker>
        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            debounceTime={Platform.OS === 'android' ? 200 : 0}
            onPress={async () => {
              if (activeSlideIndex === 11) {
                navigation.navigate('Onboarding', {
                  screen: 'VerifyPhrase',
                  params: {keyId, words},
                });
              } else {
                // @ts-ignore
                ref.current.snapToNext();
              }
            }}>
            Next
          </Button>
        </CtaContainer>
      </BodyContainer>
    </RecoveryPhraseContainer>
  );
};

export default RecoveryPhrase;
