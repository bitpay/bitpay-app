import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
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
import {useAppDispatch} from '../../../utils/hooks';
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

interface WordItem {
  word: string;
  isActive: boolean;
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

const renderItem = ({item: word, index}: {item: string; index: number}) => {
  return (
    <WordContainer key={index}>
      <H2>{word}</H2>
      <DottedBorder />
    </WordContainer>
  );
};

const VerifyPhrase: React.FC<VerifyPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const {params} = route;
  const {keyId, context, key, walletTermsAccepted} = params;
  const [words] = useState(() =>
    params.words.map<WordItem>(w => {
      return {word: w, isActive: true};
    }),
  );

  const onPressHeaderCancel = () => {
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
  };
  const onPressHeaderCancelRef = useRef(onPressHeaderCancel);
  onPressHeaderCancelRef.current = onPressHeaderCancel;

  const headerTitle = useMemo(() => {
    return () => <HeaderTitle>{t('Verify your Phrase')}</HeaderTitle>;
  }, [t]);

  const headerRight = useMemo(() => {
    return () => (
      <HeaderRightContainer>
        <Button
          accessibilityLabel="cancel-button"
          buttonType={'pill'}
          onPress={onPressHeaderCancelRef.current}>
          {t('Cancel')}
        </Button>
      </HeaderRightContainer>
    );
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle,
      headerRight,
    });
  }, [navigation, headerTitle, headerRight]);

  const carouselRef = useRef<ICarouselInstance>(null);
  const shuffledWords = useRef<Array<WordItem>>(
    [...words].sort(() => Math.random() - 0.5),
  );
  const [progress, setProgress] = useState(0.5);
  const [attemptedWords, setAttemptedWords] = useState<string[]>([]);
  const [carouselItems, setCarouselItems] = useState(['']);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    return navigation.addListener('blur', async () => {
      await sleep(400);
      setAttemptedWords([]);
      setIsAnimating(false);
      shuffledWords.current.forEach(w => (w.isActive = true));
    });
  }, [navigation]);

  const wordSelected = async (value: WordItem) => {
    if (isAnimating) {
      return;
    }

    // lock UI
    setIsAnimating(true);
    value.isActive = false;
    haptic('impactLight');

    // store words and update index
    const currentAttemptedWords = attemptedWords.concat(value.word);
    setAttemptedWords(currentAttemptedWords);
    setCarouselItems(currentAttemptedWords.concat(''));

    await sleep(500);

    if (currentAttemptedWords.length < words.length) {
      carouselRef.current?.next();
    } else {
      if (words.every((w, index) => w.word === currentAttemptedWords[index])) {
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
          loop={false}
          vertical={false}
          width={WIDTH}
          height={Math.round(WIDTH) / 2}
          autoPlay={false}
          data={carouselItems}
          ref={carouselRef}
          scrollAnimationDuration={250}
          onSnapToItem={() => setIsAnimating(false)}
          enabled={false}
          renderItem={renderItem}
        />
        <CountTracker>
          <CountText>
            {attemptedWords.length}/{words.length}
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
