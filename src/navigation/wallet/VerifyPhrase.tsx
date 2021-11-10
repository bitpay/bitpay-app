import React, {useRef, useState} from 'react';
import styled from 'styled-components/native';
import {
  BaseText,
  H2,
  H3,
  Paragraph,
  TextAlign,
} from '../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {HeaderTitleContainer, WIDTH} from '../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {Air, NeutralSlate, ProgressBlue} from '../../styles/colors';
import Carousel from 'react-native-snap-carousel';
import haptic from '../../components/haptic-feedback/haptic';
import {
  BodyContainer,
  CountText,
  CountTracker,
  DirectionsContainer,
  ProgressBarContainer,
  WordContainer,
} from './RecoveryPhrase';
import {sleep} from '../../utils/helper-methods';
import {AppActions} from '../../store/app';
import {useDispatch, useSelector} from 'react-redux';
import throttle from 'lodash.throttle';
import {RootState} from '../../store';

const VerifyPhraseContainer = styled.View`
  flex: 1;
`;

const BottomContainer = styled.View`
  margin-top: 25px;
`;

const WordSelectorContainer = styled.View`
  width: 85%;
  align-self: center;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
`;

const WordSelector = styled.TouchableOpacity`
  background: ${NeutralSlate};
  padding: 10px 15px;
  margin: 5px;
  border-radius: 5px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

const WordSelectorText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 19px;
  letter-spacing: 0;
  text-align: center;
`;

const VerifyPhrase = () => {
  const ref = useRef(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const key = useSelector(({WALLET}: RootState) => WALLET.keys[0]);
  const _words = key.mnemonic.trim().split(' ');
  // const _words = [
  //   'horse',
  //   'dog',
  //   'battery',
  //   'lazy',
  //   'grumpy',
  //   'staple',
  //   'wizard',
  //   'yolo',
  //   'correct',
  //   'brew',
  //   'toxic',
  //   'queen',
  // ];

  const shuffledWords = useRef<Array<string>>(
    _words.sort(() => Math.random() - 0.5),
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [verifiedWords, setVerifiedWords] = useState(['']);
  const [progress, setProgress] = useState(0.5);

  const wordSelected = throttle(async (word: string) => {
    const update = [...verifiedWords.filter(w => w), word, ''];
    setVerifiedWords(update);
    setActiveSlideIndex(activeSlideIndex + 1);
    await sleep(200);
    if (activeSlideIndex !== 11) {
      // @ts-ignore
      ref.current.snapToNext();
    } else {
      await dispatch(
        AppActions.showBottomNotificationModal({
          type: 'success',
          title: 'Phrase verified',
          message:
            'In order to protect your funds from being accessible to hackers and thieves, store this recovery phrase in a safe and secure place.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () =>
                navigation.navigate('Onboarding', {
                  screen: 'TermsOfUse',
                }),
              primary: true,
            },
          ],
        }),
      );

      setProgress(1);
    }
  }, 200);

  return (
    <VerifyPhraseContainer>
      <HeaderTitleContainer>
        <TextAlign align={'left'}>
          <H3>Verify your Phrase</H3>
        </TextAlign>
      </HeaderTitleContainer>
      <ProgressBarContainer>
        <Progress.Bar
          progress={progress}
          width={null}
          color={ProgressBlue}
          unfilledColor={Air}
          borderColor={Air}
          borderWidth={0}
          borderRadius={0}
        />
      </ProgressBarContainer>

      <BodyContainer>
        <Carousel
          vertical={false}
          layout={'default'}
          useExperimentalSnap={true}
          data={verifiedWords}
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
            haptic('impactLight');
            setActiveSlideIndex(index);
          }}
          scrollEnabled={false}
          // @ts-ignore
          disableIntervalMomentum={true}
        />
        <CountTracker>
          <CountText>{activeSlideIndex}/12</CountText>
        </CountTracker>
        <BottomContainer>
          <DirectionsContainer>
            <TextAlign align={'center'}>
              <Paragraph>Tap each word in the correct order.</Paragraph>
            </TextAlign>
          </DirectionsContainer>
          <WordSelectorContainer>
            {shuffledWords.current.map(word => (
              <WordSelector
                key={word}
                onPress={() => wordSelected(word)}
                disabled={verifiedWords.includes(word)}>
                <WordSelectorText>{word}</WordSelectorText>
              </WordSelector>
            ))}
          </WordSelectorContainer>
        </BottomContainer>
      </BodyContainer>
    </VerifyPhraseContainer>
  );
};

export default VerifyPhrase;
