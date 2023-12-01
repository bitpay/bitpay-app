import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {
  CtaContainerAbsolute,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {AppActions} from '../../../store/app';
import {useAppDispatch} from '../../../utils/hooks';
import {WalletActions} from '../../../store/wallet';
import Button from '../../../components/button/Button';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {Slate30, SlateDark} from '../../../styles/colors';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';

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

const VerifyPhraseContainer = styled.SafeAreaView`
  flex: 1;
`;

const VerifyPhraseForm = styled.View`
  flex: 1;
  padding: 0 20px;
`;

const VerifyPhraseField = styled.View`
  margin-bottom: 20px;
`;

const HeaderContainer = styled.View`
  margin: 25px;
`;

const HeaderText = styled(BaseText)`
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
`;

const schema = yup.object().shape({
  word1: yup.string().required().trim(),
  word2: yup.string().required().trim(),
  word3: yup.string().required().trim(),
});

const VerifyPhrase: React.FC<VerifyPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const {control, handleSubmit, setError, reset, formState} = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    defaultValues: {
      word1: '',
      word2: '',
      word3: '',
    },
  });
  const {errors, isValid} = formState;

  const {params} = route;
  const {words, keyId, context, key, walletTermsAccepted} = params;

  const ordinalNumbers: string[] = [
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth',
    'tenth',
    'eleventh',
    'twelfth',
  ];

  const getOrdinalSuffixStr = (index: number): string => {
    const suffixes = ['st', 'nd', 'rd', 'th']; // Handles up to 10th
    return index > 3 && index < 12
      ? `${index + 1}th`
      : `${index + 1}${suffixes[index]}`;
  };

  const generateRandomWords = (): {
    word: string;
    index: number;
    indexStr: string;
    ordinalSrt: string;
  }[] => {
    const randomIndices: number[] = [];
    while (randomIndices.length < 3) {
      const randomIndex = Math.floor(Math.random() * words.length);
      if (!randomIndices.includes(randomIndex)) {
        randomIndices.push(randomIndex);
      }
    }
    return randomIndices.map(index => ({
      word: words[index],
      index,
      indexStr: getOrdinalSuffixStr(index),
      ordinalSrt: ordinalNumbers[index],
    }));
  };

  const [randomWords, setRandomWords] = useState(generateRandomWords());

  const checkAnswer = (data: {word1: string; word2: string; word3: string}) => {
    const allData = [data.word1, data.word2, data.word3];
    const areAllCorrect = allData.every(
      (userInput, index) =>
        userInput.toLowerCase() === randomWords[index].word.toLowerCase(),
    );

    if (areAllCorrect) {
      // user have already been through the backup flow no need to set the flag again
      if (context !== 'keySettings') {
        dispatch(WalletActions.setBackupComplete(keyId));
      }
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
      allData.forEach((word: string, index) => {
        if (word.toLowerCase() !== randomWords[index].word.toLowerCase()) {
          switch (index) {
            case 0:
              setError('word1', {type: 'manual', message: 'Incorrect word'});
              break;
            case 1:
              setError('word2', {type: 'manual', message: 'Incorrect word'});
              break;
            case 2:
              setError('word3', {type: 'manual', message: 'Incorrect word'});
              break;
          }
        }
      });

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
                reset();
                setRandomWords(generateRandomWords());
              },
              primary: true,
            },
          ],
        }),
      );
    }
  };

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
          'Your recovery key is composed of 12 randomly selected words. ' +
            'Take a couple of minutes to carefully write down each word in order they appear.',
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

  return (
    <VerifyPhraseContainer accessibilityLabel="verify-phrase-container">
      <HeaderContainer>
        <HeaderText>
          {t(
            'Verify you saved your recovery phrase correctly by writing in ' +
              'the {{first}} ({{firstNumber}}), {{second}} ({{secondNumber}}) ' +
              'and {{third}} ({{thirdNumber}}) word in your recovery phrase.',
            {
              first: randomWords[0].ordinalSrt,
              firstNumber: randomWords[0].indexStr,
              second: randomWords[1].ordinalSrt,
              secondNumber: randomWords[1].indexStr,
              third: randomWords[2].ordinalSrt,
              thirdNumber: randomWords[2].indexStr,
            },
          )}
        </HeaderText>
      </HeaderContainer>
      <VerifyPhraseForm>
        <VerifyPhraseField>
          <Controller
            key={'word1'}
            control={control}
            render={({field}) => (
              <BoxInput
                label={randomWords[0].indexStr + ' Word'}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value}
                error={errors.word1?.message}
                autoCorrect={false}
              />
            )}
            name={'word1'}
          />
        </VerifyPhraseField>
        <VerifyPhraseField>
          <Controller
            key={'word2'}
            control={control}
            render={({field}) => (
              <BoxInput
                label={randomWords[1].indexStr + ' Word'}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value}
                error={errors.word2?.message}
                autoCorrect={false}
              />
            )}
            name={'word2'}
          />
        </VerifyPhraseField>
        <VerifyPhraseField>
          <Controller
            key={'word3'}
            control={control}
            render={({field}) => (
              <BoxInput
                label={randomWords[2].indexStr + ' Word'}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value}
                error={errors.word3?.message}
                autoCorrect={false}
              />
            )}
            name={'word3'}
          />
        </VerifyPhraseField>
      </VerifyPhraseForm>
      <CtaContainerAbsolute accessibilityLabel="cta-container">
        <Button disabled={!isValid} onPress={handleSubmit(checkAnswer)}>
          Confirm
        </Button>
      </CtaContainerAbsolute>
    </VerifyPhraseContainer>
  );
};

export default VerifyPhrase;
