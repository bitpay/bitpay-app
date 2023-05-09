import React, {useEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {
  BaseText,
  H2,
  HeaderTitle,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {
  HeaderRightContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {
  Action,
  Air,
  LightBlack,
  NeutralSlate,
  ProgressBlue,
} from '../../../styles/colors';
import Carousel from 'react-native-snap-carousel';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  BodyContainer,
  CountText,
  CountTracker,
  DirectionsContainer,
  ProgressBarContainer,
  WordContainer,
} from './RecoveryPhrase';
import {sleep} from '../../../utils/helper-methods';
import {AppActions} from '../../../store/app';
import {useDispatch} from 'react-redux';
import {WalletActions} from '../../../store/wallet';
import Button from '../../../components/button/Button';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';

type VerifyPhraseScreenProps = StackScreenProps<
  WalletStackParamList,
  'VerifyPhrase'
>;

export interface VerifyPhraseParamList {
  keyId: string;
  words: string[];
  context: string;
  key: Key;
  walletTermsAccepted: boolean;
}

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
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  padding: 8px 12px;
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
  color: ${({theme}) => theme.colors.text};
`;

const VerifyPhrase: React.FC<VerifyPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {params} = route;
  const {keyId, words: _words, context, key, walletTermsAccepted} = params;

  let words = _words.map(w => {
    return {word: w, isActive: true};
  });

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{t('Verify your Phrase')}</HeaderTitle>,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="cancel-button"
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');

              if (context === 'settings') {
                backupRedirect({
                  context,
                  navigation,
                  walletTermsAccepted,
                  key,
                });
                return;
              }

              dispatch(
                AppActions.showBottomNotificationModal({
                  type: 'warning',
                  title: t("Don't risk losing your money"),
                  message: t(
                    'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in order they appear.',
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t("I'M SURE"),
                      action: () =>
                        backupRedirect({
                          context,
                          navigation,
                          walletTermsAccepted,
                          key,
                        }),
                      primary: true,
                    },
                  ],
                }),
              );
            }}>
            {t('Cancel')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const ref = useRef(null);
  const shuffledWords = useRef<Array<{word: string; isActive: boolean}>>(
    [...words].sort(() => Math.random() - 0.5),
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

  const wordSelected = async (value: {word: string; isActive: boolean}) => {
    if (isAnimating) {
      return;
    }
    value.isActive = false;
    haptic('impactLight');
    // lock UI - (unlocks from onSnap event in carousel props in jsx)
    setIsAnimating(true);
    // update words and append empty string for next entry
    const update = [...attemptWords.filter(w => w), value.word, ''];
    // store words and update index
    setAttemptWords(update);
    setActiveSlideIndex(activeSlideIndex + 1);
    // sleep for animation time
    await sleep(0);
    if (activeSlideIndex !== words.length - 1) {
      // @ts-ignore
      ref.current.snapToNext();
    } else {
      // filter out empty string and compare words against real order
      const compareWords = update.filter(w => w);
      if (words.every((w, index) => w.word === compareWords[index])) {
        // user have already been through the backup flow no need to set the flag again
        if (context !== 'keySettings') {
          dispatch(WalletActions.setBackupComplete(keyId));
        }
        setProgress(1);
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'success',
            title: t('Phrase verified'),
            message: t(
              'In order to protect your funds from being accessible to hackers and thieves, store this recovery phrase in a safe and secure place.',
            ),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('OK'),
                action: () =>
                  backupRedirect({
                    context,
                    navigation,
                    walletTermsAccepted,
                    key: {...key, backupComplete: true},
                  }),
                primary: true,
              },
            ],
          }),
        );
      } else {
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'warning',
            title: t('Incorrect recovery phrase'),
            message: t('The recovery phrase you provided was incorrect.'),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('TRY AGAIN'),
                action: async () => {
                  navigation.navigate(
                    context === 'onboarding' ? 'Onboarding' : 'Wallet',
                    {
                      screen: 'RecoveryPhrase',
                      params,
                    },
                  );
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
    <VerifyPhraseContainer accessibilityLabel="verify-phrase-container">
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
          renderItem={({item: word, index}: {item: string; index: number}) => {
            return (
              <WordContainer key={index}>
                <H2>{word}</H2>
                <DottedBorder />
              </WordContainer>
            );
          }}
          ref={ref}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
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
          <CountText>
            {activeSlideIndex}/{words.length}
          </CountText>
        </CountTracker>
        <BottomContainer>
          <DirectionsContainer>
            <TextAlign align={'center'}>
              <Paragraph>{t('Tap each word in the correct order.')}</Paragraph>
            </TextAlign>
          </DirectionsContainer>
          <WordSelectorContainer>
            {shuffledWords.current.map((value, index) => (
              <WordSelector
                accessibilityLabel="word-selector"
                key={index}
                onPress={() => {
                  wordSelected(value);
                }}
                disabled={!value.isActive}>
                <WordSelectorText>{value.word}</WordSelectorText>
              </WordSelector>
            ))}
          </WordSelectorContainer>
        </BottomContainer>
      </BodyContainer>
    </VerifyPhraseContainer>
  );
};

export default VerifyPhrase;
