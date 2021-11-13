import React, {useEffect, useRef, useState} from 'react';
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
import {Action, Air, NeutralSlate, ProgressBlue} from '../../styles/colors';
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
import {RootState} from '../../store';
import {WalletActions} from '../../store/wallet';

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
  position: relative;
`;

const DottedBorder = styled.View`
  border: 1px dashed ${Action};
  height: 1px;
  width: 70%;
  position: absolute;
  bottom: 30%;
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
  const shuffledWords = useRef<Array<string>>(
    [..._words].sort(() => Math.random() - 0.5),
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [attemptWords, setAttemptWords] = useState(['']);
  const [progress, setProgress] = useState(0.5);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    return navigation.addListener('blur', async () => {
      await sleep(400);
      setActiveSlideIndex(0);
      setAttemptWords(['undefined']);
      setIsAnimating(false);
    });
  }, [navigation]);

  const wordSelected = async (word: string) => {
    haptic('impactLight');
    if (isAnimating) {
      return;
    }
    // lock UI - (unlocks from onSnap event in carousel props in jsx)
    setIsAnimating(true);
    // update words and append empty string for next entry
    const update = [...attemptWords.filter(w => w), word, ''];
    // store words and update index
    setAttemptWords(update);
    setActiveSlideIndex(activeSlideIndex + 1);
    // sleep for animation time
    await sleep(100);
    if (activeSlideIndex !== 11) {
      // @ts-ignore
      ref.current.snapToNext();
    } else {
      // filter out empty string and compare words against real order
      const compareWords = update.filter(w => w);
      if (_words.every((_word, index) => _word === compareWords[index])) {
        dispatch(WalletActions.setBackupComplete(key.id));
        dispatch(
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
      } else {
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'warning',
            title: 'Incorrect Recovery Phrase',
            message: 'The recovery phrase you provided was incorrect.',
            enableBackdropDismiss: false,
            actions: [
              {
                text: 'TRY AGAIN',
                action: async () => {
                  navigation.navigate('Onboarding', {
                    screen: 'RecoveryPhrase',
                  });
                },
                primary: true,
              },
            ],
          }),
        );
      }
    }
  };

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
          data={attemptWords}
          renderItem={({item: word}: {item: string}) => {
            return (
              <WordContainer key={word}>
                <H2>{word}</H2>
                <DottedBorder />
              </WordContainer>
            );
          }}
          ref={ref}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
          onScrollIndexChanged={(index: number) => {
            setActiveSlideIndex(index);
          }}
          onSnapToItem={() => setIsAnimating(false)}
          scrollEnabled={false}
          // @ts-ignore
          disableIntervalMomentum={true}
          animationOptions={{
            friction: 4,
            tension: 40,
            isInteraction: false,
            useNativeDriver: true,
          }}
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
                disabled={attemptWords.includes(word)}>
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
