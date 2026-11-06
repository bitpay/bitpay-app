import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {AppActions} from '../../../store/app';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WalletActions} from '../../../store/wallet';
import Button from '../../../components/button/Button';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {backupRedirect} from './Backup';
import {Caution} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {isEnglishRecoveryWord} from '../../../utils/recoveryPhraseWords';
import {getDecoyWords, pickGapIndexes} from '../../../utils/verifyPhrase';
import {useBackupColors} from '../../../components/backup/colors';
import {PhraseCell} from '../../../components/backup/PhraseCell';
import {Pill} from '../../../components/backup/BackupCards';
import {showTopToast} from '../../../components/backup/TopToast';

type VerifyPhraseScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.VERIFY_PHRASE
>;

export interface VerifyPhraseParamList {
  keyId: string;
  words: string[];
  context?: string;
  key?: Key;
  walletTermsAccepted: boolean;
}

// Fabric's InputAccessoryView attaches only to the first TextInput with its nativeID.
const pillsAccessoryId = (gap: number) => `verifyPhrasePills${gap}`;

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 12, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  grid: {gap: 6},
  gridRow: {flexDirection: 'row', gap: 6},
  input: {fontSize: 16, fontWeight: '500', padding: 0},
  alert: {color: Caution, fontSize: 13},
  footer: {paddingHorizontal: 12, paddingTop: 12},
  pills: {
    minHeight: 50,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  pillsBar: {borderTopWidth: 1},
  androidPills: {position: 'absolute', left: 0, right: 0},
});

const normalize = (value?: string) => (value || '').trim().toLowerCase();

const VerifyPhrase: React.FC<VerifyPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const colors = useBackupColors();
  const {params} = route;
  const storedKey = useAppSelector(({WALLET}) => WALLET.keys[params.keyId]);
  const {words, keyId, context, walletTermsAccepted} = params;
  const key = params.key ?? storedKey;

  const phraseIsEnglish = useMemo(
    () => words.every(isEnglishRecoveryWord),
    [words],
  );
  const [gaps] = useState(() => pickGapIndexes(words.length));
  const [bank] = useState(() => {
    const answers = gaps.map(gap => words[gap]);
    return [
      ...answers,
      ...(phraseIsEnglish ? getDecoyWords(answers, words) : []),
    ].sort();
  });
  const [fill, setFill] = useState<Record<number, string>>({});
  const [active, setActive] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRefs = useRef<Record<number, TextInput | null>>({});

  const isComplete = (value?: string) =>
    phraseIsEnglish ? isEnglishRecoveryWord(value || '') : !!normalize(value);
  const isRight = (gap: number) => normalize(fill[gap]) === words[gap];
  const misses = checked ? gaps.filter(gap => !isRight(gap)) : [];

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      Object.values(inputRefs.current).forEach(input => input?.blur());
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const leaveBackup = () =>
    backupRedirect({context, navigation, walletTermsAccepted, key});

  const onPressHeaderCancel = () => {
    haptic('impactLight');
    if (context === 'settings' || key?.backupComplete) {
      leaveBackup();
      return;
    }
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'warning',
        title: t("Don't risk losing your money"),
        message: t(
          'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in the order they appear.',
        ),
        enableBackdropDismiss: true,
        actions: [{text: t("I'M SURE"), action: leaveBackup, primary: true}],
      }),
    );
  };
  const onPressHeaderCancelRef = useRef(onPressHeaderCancel);
  useLayoutEffect(() => {
    onPressHeaderCancelRef.current = onPressHeaderCancel;
  });

  const headerTitle = useMemo(() => {
    return () => <HeaderTitle>{t('Verify Phrase')}</HeaderTitle>;
  }, [t]);

  const headerRight = useMemo(() => {
    return () => (
      <HeaderRightContainer>
        <Button
          testID="cancel-button"
          accessibilityLabel={t('Cancel')}
          buttonType={'pill'}
          onPress={() => onPressHeaderCancelRef.current()}>
          {t('Cancel')}
        </Button>
      </HeaderRightContainer>
    );
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({headerTitle, headerRight});
  }, [navigation, headerTitle, headerRight]);

  const finish = () => {
    backupRedirect({
      context,
      navigation,
      walletTermsAccepted,
      key: key ? {...key, backupComplete: true} : undefined,
    });
    showTopToast({
      text: t('Manual backup completed.'),
      kind: 'ok',
      durationMs: 2600,
    });
  };

  const check = async (values: Record<number, string>) => {
    Keyboard.dismiss();
    setActive(null);
    setChecked(true);
    if (!gaps.every(gap => normalize(values[gap]) === words[gap])) {
      return;
    }
    dispatch(WalletActions.setBackupComplete(keyId));
    await sleep(450);
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'success',
        title: t('Phrase verified'),
        message: t(
          'In order to protect your funds from being accessible to hackers and thieves, store this recovery phrase in a safe and secure place.',
        ),
        enableBackdropDismiss: false,
        actions: [{text: t('OK'), action: finish, primary: true}],
      }),
    );
  };

  const advance = (values: Record<number, string>) => {
    const next = gaps.find(gap => gap !== active && !isComplete(values[gap]));
    if (next === undefined) {
      check(values);
      return;
    }
    inputRefs.current[next]?.focus();
  };

  const edit = (gap: number, text: string) => {
    const value = text.replace(/\s/g, '');
    const values = {...fill, [gap]: value};
    setFill(values);
    setChecked(false);
    if (/\s$/.test(text) && isComplete(value)) {
      advance(values);
    }
  };

  const pick = (word: string) => {
    if (active === null) {
      return;
    }
    haptic('impactLight');
    const values = {...fill, [active]: word};
    setFill(values);
    setChecked(false);
    advance(values);
  };

  const typed = active === null ? '' : normalize(fill[active]);
  const usedElsewhere = gaps
    .filter(gap => gap !== active)
    .map(gap => normalize(fill[gap]));
  const pills = bank.filter(
    word => !usedElsewhere.includes(word) && (!typed || word.startsWith(typed)),
  );

  const mismatchMessage = (numbers: number[]) =>
    numbers.length === 1
      ? t('Word #{{number}} doesn’t match.', {number: numbers[0]})
      : t('Words {{list}} and #{{last}} don’t match.', {
          list: numbers
            .slice(0, -1)
            .map(number => `#${number}`)
            .join(', '),
          last: numbers[numbers.length - 1],
        });

  const pillsBar = (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('Suggestions')}
      style={[
        styles.pillsBar,
        {backgroundColor: colors.screenBg, borderTopColor: colors.borderCard},
      ]}
      contentContainerStyle={styles.pills}>
      {pills.map(word => (
        <Pill key={word} size="lg" label={word} onPress={() => pick(word)} />
      ))}
    </ScrollView>
  );

  const rows = Array.from({length: Math.ceil(words.length / 2)}, (_, row) => [
    row * 2,
    row * 2 + 1,
  ]).map(pair => pair.filter(index => index < words.length));

  return (
    <SafeAreaView
      edges={['bottom']}
      testID="verify-phrase-container"
      style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          style={styles.content}>
          <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
            {t('Fill in the missing words from your recovery phrase.')}
          </BaseText>
          <View style={styles.grid}>
            {rows.map(pair => (
              <View key={pair[0]} style={styles.gridRow}>
                {pair.map(index => {
                  if (!gaps.includes(index)) {
                    return (
                      <PhraseCell key={index} n={index + 1} tone="hidden">
                        •••••
                      </PhraseCell>
                    );
                  }
                  const tone = checked
                    ? isRight(index)
                      ? 'right'
                      : 'wrong'
                    : active === index
                    ? 'active'
                    : fill[index]
                    ? 'filled'
                    : 'blank';
                  return (
                    <PhraseCell
                      key={index}
                      n={index + 1}
                      tone={tone}
                      input
                      onPress={() => inputRefs.current[index]?.focus()}>
                      <TextInput
                        ref={input => {
                          inputRefs.current[index] = input;
                        }}
                        testID={`verify-gap-${index + 1}`}
                        accessibilityLabel={t('Word {{position}}', {
                          position: index + 1,
                        })}
                        value={fill[index] || ''}
                        onChangeText={text => edit(index, text)}
                        onFocus={() => {
                          setActive(index);
                          setChecked(false);
                        }}
                        onBlur={() =>
                          setActive(current =>
                            current === index ? null : current,
                          )
                        }
                        onSubmitEditing={() => {
                          if (isComplete(fill[index])) {
                            advance(fill);
                          }
                        }}
                        placeholder={
                          active === index ? t('Type or pick') : undefined
                        }
                        placeholderTextColor={colors.textPlaceholder}
                        inputAccessoryViewID={
                          Platform.OS === 'ios'
                            ? pillsAccessoryId(index)
                            : undefined
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        autoComplete="off"
                        importantForAutofill="no"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        style={[styles.input, {color: colors.textPrimary}]}
                      />
                    </PhraseCell>
                  );
                })}
              </View>
            ))}
          </View>
          {misses.length ? (
            <BaseText accessibilityRole="alert" style={styles.alert}>
              {mismatchMessage(misses.map(gap => gap + 1))}
            </BaseText>
          ) : null}
        </Pressable>
      </ScrollView>
      {active === null ? (
        <View style={styles.footer}>
          <Button
            testID="confirm-button"
            disabled={
              !gaps.every(gap => isComplete(fill[gap])) || !!misses.length
            }
            onPress={() => check(fill)}>
            {t('Confirm')}
          </Button>
        </View>
      ) : null}
      {Platform.OS === 'ios' ? (
        gaps.map(gap => (
          <InputAccessoryView key={gap} nativeID={pillsAccessoryId(gap)}>
            {pillsBar}
          </InputAccessoryView>
        ))
      ) : active !== null && keyboardHeight ? (
        <View style={[styles.androidPills, {bottom: keyboardHeight}]}>
          {pillsBar}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default VerifyPhrase;
