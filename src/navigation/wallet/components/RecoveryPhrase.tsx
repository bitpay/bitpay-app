import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {useTheme} from '../../../contexts';
import {
  Action,
  Caution,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  SlateDark,
  Warning,
  White,
} from '../../../styles/colors';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {
  ActiveOpacity,
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptionsContainer,
  Column,
  CtaContainer as _CtaContainer,
  HeaderContainer,
  ImportTextInput,
  Row,
  ScanContainer,
  SheetContainer,
} from '../../../components/styled/Containers';
import Button, {ButtonState} from '../../../components/button/Button';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useForm} from 'react-hook-form';
import {
  BaseText,
  H4,
  H7,
  ImportTitle,
  Paragraph,
  Small,
  TextAlign,
} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useScreenRenderPerformance} from '../../../utils/hooks/useScreenRenderPerformance';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import PerformanceProfiler from '../../../components/performance/PerformanceProfiler';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {
  findExistingRecoveryKey,
  normalizeMnemonic,
  startCreateKeyWithOpts,
  startGetRates,
  startImportMnemonic,
  startImportWithDerivationPath,
} from '../../../store/wallet/effects';
import {
  NavigationProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {ImportObj} from '../../../store/scan/scan.models';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import type {ScanGroupParamList} from '../../scan/ScanGroup';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {
  fixWalletAddresses,
  formatCurrencyAbbreviation,
  getAccount,
  getDerivationStrategy,
  getNetworkName,
  isValidDerivationPath,
  keyExtractor,
  parsePath,
  sleep,
} from '../../../utils/helper-methods';
import {DefaultDerivationPath} from '../../../constants/defaultDerivationPath';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {
  SupportedCurrencyOption,
  SupportedCurrencyOptions,
} from '../../../constants/SupportedCurrencyOptions';
import Icons from '../components/WalletIcons';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  AppState,
  FlatList,
  InputAccessoryView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Pill} from '../../../components/backup/BackupCards';
import {useBackupColors} from '../../../components/backup/colors';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {populateImportedKeyPortfolio} from '../../../store/portfolio';
import {
  GetName,
  isSingleAddressChain,
} from '../../../store/wallet/utils/currency';
import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {IS_ANDROID, IS_IOS} from '../../../constants';
import {
  useAppDispatch,
  useAppSelector,
  useSensitiveRefClear,
} from '../../../utils/hooks';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useOngoingProcess} from '../../../contexts';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  autocorrectRecoveryWords,
  getEnglishWordsStartingWith,
  getNearestEnglishWords,
  getUniqueEnglishWord,
  isEnglishRecoveryWord,
  isMnemonicError,
  isOtherLanguageRecoveryWord,
  isValidEnglishPhrase,
  isValidRecoveryPhrase,
} from '../../../utils/recoveryPhraseWords';

const MAX_PHRASE_WORDS = 24;
const WORD_SEPARATOR = /[\u3000\s]+/;
const NON_WORD_CHARACTERS = /[0-9.,;:\-_|"'()[\]]+/g;
const EXTENDED_PRIVATE_KEY = /[xt]prv/;
const SUGGESTION_COUNT = 3;

const toPhraseWords = (text: string) =>
  text
    .toLowerCase()
    .replace(NON_WORD_CHARACTERS, ' ')
    .trim()
    .split(WORD_SEPARATOR)
    .filter(Boolean);

const fitsChips = (phrase: string) => {
  const words = toPhraseWords(phrase);
  return (
    !EXTENDED_PRIVATE_KEY.test(phrase) &&
    (words.length === 12 || words.length === MAX_PHRASE_WORDS) &&
    words.every(isEnglishRecoveryWord)
  );
};

const firstInvalidIndex = (words: string[]) => {
  const index = words.findIndex(word => !isEnglishRecoveryWord(word));
  return index < 0 ? null : index;
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    marginTop: 20,
  },
  contentView: {
    paddingTop: 0,
    paddingRight: 12,
    paddingBottom: 20,
    paddingLeft: 12,
  },
  passwordParagraph: {
    marginTop: 0,
    marginRight: 20,
    marginBottom: 20,
    marginLeft: 20,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 5,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 10,
  },
  cuationText: {
    paddingTop: 5,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  checkBoxContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    top: 0,
    left: 20,
  },
  currencySelectorContainer: {
    marginVertical: 20,
    position: 'relative',
  },
  currencyContainer: {
    paddingHorizontal: 20,
    minHeight: 55,
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  currencyName: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '500',
    marginLeft: 10,
    color: '#9ba3ae',
  },
  currencySelectionModalContainer: {
    padding: 15,
    minHeight: 200,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  inputContainer: {
    padding: 18,
  },
  ctaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  currencyColumn: {
    justifyContent: 'center',
    marginRight: 8,
  },
  currencyTitleColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  },
  currencyTitle: {
    margin: 0,
    padding: 0,
  },
  currencySubTitle: {
    fontSize: 12,
  },
  intro: {
    fontSize: 16,
    lineHeight: 25,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counter: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  chipsField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: 6,
    minHeight: 132,
    padding: 8,
    paddingBottom: 44,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 0.75,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  chipNumber: {
    fontSize: 12,
    opacity: 0.7,
  },
  chipWord: {
    fontSize: 14,
  },
  chipWordInvalid: {
    color: Caution,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: Caution,
  },
  chipInput: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 60,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pastePill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  status: {
    paddingTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  suggestionContainer: {flexGrow: 0, borderTopWidth: 1},
  hiddenInput: {
    display: 'none',
  },
});

const ScrollViewContainer = ({
  style,
  inputAccessoryView,
  ...rest
}: React.ComponentProps<typeof KeyboardAwareScrollView> & {
  inputAccessoryView?: React.ReactNode;
}) => (
  <>
    <KeyboardAwareScrollView
      style={[styles.scrollViewContainer, style]}
      {...rest}
    />
    {inputAccessoryView}
  </>
);

const ContentView = ({style, ...rest}: ViewProps) => (
  <View style={[styles.contentView, style]} {...rest} />
);

const PasswordParagraph = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.passwordParagraph,
          {color: theme.colors.description},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const ErrorText = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.errorText, style]} {...rest} />
));

const CuationText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Small
        ref={ref}
        style={[
          styles.cuationText,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const schema = yup.object().shape({
  text: yup.string().required(),
});

const CheckBoxContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.checkBoxContainer, style]} {...rest} />
);

const OptionTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.optionTitle,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const Label = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.label,
        {color: theme && theme.dark ? theme.colors.text : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const CurrencySelectorContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.currencySelectorContainer, style]} {...rest} />
);

const CurrencyContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.currencyContainer,
        {
          backgroundColor: theme.dark ? LightBlack : NeutralSlate,
          borderColor: theme.dark ? LightBlack : NeutralSlate,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const CurrencyName = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.currencyName, style]} {...rest} />
  ),
);

const CurrencySelectionModalContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SheetContainer>) => (
  <SheetContainer
    style={[styles.currencySelectionModalContainer, style]}
    {...rest}
  />
);

const CurrencyOptions = SupportedCurrencyOptions.filter(
  currency => !currency.isToken,
);

const RowContainer: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.rowContainer, style]} {...rest} />;

const InputContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.inputContainer, style]} {...rest} />
);

const CtaContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof _CtaContainer>) => (
  <_CtaContainer style={[styles.ctaContainer, style]} {...rest} />
);

const CurrencyColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.currencyColumn, style]} {...rest} />
);

const CurrencyTitleColumn = ({style, ...rest}: ViewProps) => (
  <View
    style={[styles.currencyColumn, styles.currencyTitleColumn, style]}
    {...rest}
  />
);

const CurrencyTitle = React.forwardRef<Text, TextProps & {medium?: boolean}>(
  ({style, medium = true, ...rest}, ref) => (
    <H7
      ref={ref}
      medium={medium}
      style={[styles.currencyTitle, style]}
      {...rest}
    />
  ),
);

const CurrencySubTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.currencySubTitle,
          {color: theme.dark ? LuckySevens : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const RecoveryPhrase = () => {
  const {t} = useTranslation();
  const onPerformanceLayout = useScreenRenderPerformance(
    'Import.RecoveryPhrase',
  );
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const navigation =
    useNavigation<
      NavigationProp<WalletGroupParamList & ScanGroupParamList, 'Import'>
    >();
  const route = useRoute<RouteProp<WalletGroupParamList, 'Import'>>();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const walletTermsAccepted = useAppSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );
  const [importButtonState, setImportButtonState] = useState<ButtonState>();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [derivationPathEnabled, setDerivationPathEnabled] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(CurrencyOptions[0]);
  const [recreateWallet, setRecreateWallet] = useState(false);
  const [includeTestnetWallets, setIncludeTestnetWallets] = useState(false);
  const [includeLegacyWallets, setIncludeLegacyWallets] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    derivationPath: DefaultDerivationPath.defaultBTC as string,
    coin: CurrencyOptions[0].currencyAbbreviation,
    chain: CurrencyOptions[0].chain,
    passphrase: undefined as string | undefined,
    isMultisig: false,
  });
  const colors = useBackupColors();
  const suggestionsId = useId();
  const wordsRef = useRef<TextInput>(null);
  const chipInputRef = useRef<TextInput>(null);
  const [sensitiveInputRefs] = useState(() => [wordsRef, chipInputRef]);
  const {clearSensitive} = useSensitiveRefClear(sensitiveInputRefs);
  const [{chips, selectedChip}, setChipState] = useState(() => {
    const phrase = route.params?.importQrCodeData?.split('|')[1] || '';
    return {
      chips: fitsChips(phrase) ? toPhraseWords(phrase) : [],
      selectedChip: null as number | null,
    };
  });
  const [textMode, setTextMode] = useState(
    () => !!route.params?.importQrCodeData && !chips.length,
  );
  const inputGeneration = useRef(0);
  const committedInput = useRef('');
  const [typed, setTyped] = useState('');
  const [phraseMessage, setPhraseMessage] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);
  const [chipsFocused, setChipsFocused] = useState(false);

  const {
    handleSubmit,
    register,
    setValue,
    formState: {errors},
    getValues,
    unregister,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {text: ''},
  });

  useEffect(() => {
    register('text');
    return () => unregister('text');
  }, [register, unregister]);

  const updateRecoveryPhraseValue = useCallback(
    (text: string) => {
      setValue('text', text);
    },
    [setValue],
  );

  const updateRecoveryPhraseFromExternalSource = useCallback(
    (text: string) => {
      setValue('text', text);
      wordsRef.current?.setNativeProps({text});
    },
    [setValue],
  );

  const clearRecoveryPhrase = useCallback(() => {
    inputGeneration.current++;
    committedInput.current = '';
    clearSensitive();
    setChipState({chips: [], selectedChip: null});
    setTyped('');
    setPhraseMessage(null);
    setPasted(false);
    setValue('text', '');
  }, [clearSensitive, setValue]);

  const applyTextAutocorrect = (text: string): string => {
    if (!text.trim() || text.includes('xprv') || text.includes('tprv')) {
      return text;
    }
    const words = text.trim().split(WORD_SEPARATOR);
    const corrected = autocorrectRecoveryWords(words).words.join(' ');
    if (corrected === words.join(' ')) {
      return text;
    }
    updateRecoveryPhraseFromExternalSource(corrected);
    return corrected;
  };

  const showAsText = (phrase: string) => {
    clearRecoveryPhrase();
    setTextMode(true);
    updateRecoveryPhraseFromExternalSource(phrase);
  };

  const commitWord = (word: string) => {
    chipInputRef.current?.clear();
    setTyped('');
    if (!word) {
      return;
    }
    const acceptedWord = getUniqueEnglishWord(word) ?? word;
    setChipState(current => {
      const replacing = current.selectedChip !== null;
      if (!replacing && current.chips.length >= MAX_PHRASE_WORDS) {
        return current;
      }
      const next = replacing
        ? current.chips.map((chip, index) =>
            index === current.selectedChip ? acceptedWord : chip,
          )
        : [...current.chips, acceptedWord];
      const committedIndex = replacing ? current.selectedChip : next.length - 1;
      return {
        chips: next,
        selectedChip: isEnglishRecoveryWord(acceptedWord)
          ? firstInvalidIndex(next)
          : committedIndex,
      };
    });
    setPhraseMessage(null);
    setPasted(false);
  };

  const pastePhrase = (text: string) => {
    chipInputRef.current?.clear();
    setTyped('');
    if (EXTENDED_PRIVATE_KEY.test(text)) {
      showAsText(text.trim());
      return;
    }
    const words = toPhraseWords(text);
    const englishWords = words.filter(isEnglishRecoveryWord);
    if (
      words.some(
        word =>
          !isEnglishRecoveryWord(word) && isOtherLanguageRecoveryWord(word),
      ) ||
      (words.length <= MAX_PHRASE_WORDS &&
        englishWords.length < words.length &&
        isValidRecoveryPhrase(words))
    ) {
      showAsText(words.join(' '));
      return;
    }
    if (
      !words.length ||
      englishWords.length * 2 < words.length ||
      words.length > MAX_PHRASE_WORDS
    ) {
      setPhraseMessage(t('That isn’t a recovery phrase.'));
      return;
    }
    setChipState({chips: words, selectedChip: firstInvalidIndex(words)});
    setPhraseMessage(null);
    setPasted(true);
  };

  const pasteFromClipboard = async () => {
    const generation = inputGeneration.current;
    const text = await Clipboard.getString();
    if (generation === inputGeneration.current) {
      pastePhrase(text);
    }
  };

  const onChipInputChange = (text: string) => {
    // RN drops clear() and value updates that race newer keystrokes,
    // so the field can still hold words that are already chips.
    if (
      text === committedInput.current ||
      !text.startsWith(committedInput.current)
    ) {
      committedInput.current = '';
    }
    const value = text.slice(committedInput.current.length);
    if (toPhraseWords(value).length > 1 || EXTENDED_PRIVATE_KEY.test(value)) {
      pastePhrase(text);
      return;
    }
    const word = value.toLowerCase().replace(NON_WORD_CHARACTERS, '');
    if (WORD_SEPARATOR.test(word)) {
      committedInput.current = text;
      commitWord(word.trim());
      return;
    }
    setTyped(word);
  };

  const onChipInputKeyPress = (key: string) => {
    if (key !== 'Backspace' || typed) {
      return;
    }
    if (selectedChip !== null) {
      const next = chips.filter((_, index) => index !== selectedChip);
      setChipState({chips: next, selectedChip: firstInvalidIndex(next)});
    } else if (chips.length) {
      setChipState({chips: chips.slice(0, -1), selectedChip});
    }
  };

  const toggleTextMode = () => {
    const words =
      typed && selectedChip !== null
        ? chips.map((chip, index) => (index === selectedChip ? typed : chip))
        : [...chips, typed];
    const phrase = textMode ? '' : words.filter(Boolean).join(' ');
    clearRecoveryPhrase();
    setTextMode(!textMode);
    if (phrase) {
      updateRecoveryPhraseFromExternalSource(phrase);
    }
  };

  const hidePhrase = (err: unknown) =>
    isMnemonicError(err)
      ? new Error(t('The recovery phrase is invalid.'))
      : err;

  const showErrorModal = (e: Error, submittedText?: string) => {
    if (e && e.message === 'WALLET_DOES_NOT_EXIST') {
      const text = submittedText ?? getValues().text;
      setOptsAndCreate(text, advancedOptions);
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Something went wrong'),
          message: BWCErrorMessage(e),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('OK'),
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }
  };

  const isValidPhrase = (words: string) => {
    return words && words.trim().split(/[\u3000\s]+/).length % 3 === 0;
  };

  const readImportQrCode = (code: string): string | undefined => {
    try {
      const parsedCode = code.split('|');
      const recoveryObj: ImportObj = {
        type: parsedCode[0],
        data: parsedCode[1],
        hasPassphrase: parsedCode[4] === 'true' ? true : false,
      };

      if (!isValidPhrase(recoveryObj.data)) {
        showErrorModal(new Error(t('The recovery phrase is invalid.')));
        return undefined;
      }
      if (recoveryObj.type === '1' && recoveryObj.hasPassphrase) {
        dispatch(
          showBottomNotificationModal({
            type: 'info',
            title: t('Password required'),
            message: t('Make sure to enter your password in advanced options'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {},
                primary: true,
              },
            ],
          }),
        );
      }
      return recoveryObj.data;
    } catch {
      showErrorModal(new Error('The recovery phrase is invalid.'));
      return undefined;
    }
  };

  const applyScannedPhrase = (code: string) => {
    const phrase = readImportQrCode(code);
    if (!phrase) {
      return;
    }
    if (textMode) {
      updateRecoveryPhraseFromExternalSource(phrase);
    } else if (fitsChips(phrase)) {
      pastePhrase(phrase);
    } else {
      showAsText(phrase);
    }
  };

  const setKeyOptions = (
    keyOpts: Partial<KeyOptions>,
    advancedOpts: {
      derivationPath: string;
      coin: string;
      chain: string;
      passphrase: string | undefined;
      isMultisig: boolean;
    },
  ) => {
    keyOpts.passphrase = advancedOpts.passphrase;

    // To clear encrypt password
    if (route.params?.keyId) {
      keyOpts.keyId = route.params.keyId;
    }

    if (derivationPathEnabled || recreateWallet) {
      const derivationPath = advancedOpts.derivationPath;

      keyOpts.networkName = getNetworkName(derivationPath);
      keyOpts.derivationStrategy = getDerivationStrategy(derivationPath);
      keyOpts.account = getAccount(derivationPath);

      /* TODO: keyOpts.n is just used to determinate if the wallet is multisig (m/48'/xx) or single sig (m/44')
      we should change the name to 'isMultisig'.
      isMultisig is used to allow import old multisig wallets with derivation strategy = 'BIP44'
      */
      keyOpts.n = advancedOpts.isMultisig
        ? 2
        : keyOpts.derivationStrategy === 'BIP48'
        ? 2
        : 1;

      keyOpts.coin = advancedOpts.coin.toLowerCase();
      keyOpts.chain = advancedOpts.chain.toLowerCase();
      keyOpts.singleAddress = isSingleAddressChain(advancedOpts.chain);

      // set opts.useLegacyPurpose
      if (parsePath(derivationPath).purpose === "44'" && keyOpts.n > 1) {
        keyOpts.useLegacyPurpose = true;
        logger.debug('Using 44 for Multisig');
      }

      // set opts.useLegacyCoinType
      if (
        keyOpts.coin === 'bch' &&
        parsePath(derivationPath).coinCode === "0'"
      ) {
        keyOpts.useLegacyCoinType = true;
        logger.debug('Using 0 for BCH creation');
      }

      if (
        !keyOpts.networkName ||
        !keyOpts.derivationStrategy ||
        !Number.isInteger(keyOpts.account)
      ) {
        throw new Error(t('Invalid derivation path'));
      }

      if (!isValidDerivationPath(advancedOpts.derivationPath, keyOpts.chain)) {
        throw new Error(t('Invalid derivation path for selected coin'));
      }
    }
  };

  const onSubmit = (formData: {text: string}) => {
    const corrected = applyTextAutocorrect(formData.text);
    if (corrected !== formData.text) {
      return;
    }
    startImport(corrected);
  };

  const importChips = () => {
    if (!isValidEnglishPhrase(chips)) {
      setPhraseMessage(
        t(
          'These words don’t make a valid phrase. Check them against your paper.',
        ),
      );
      return;
    }
    startImport(chips.join(' '));
  };

  const startImport = (text: string) => {
    clearRecoveryPhrase();

    let keyOpts: Partial<KeyOptions> = {};

    keyOpts.includeTestnetWallets = includeTestnetWallets;
    keyOpts.includeLegacyWallets = includeLegacyWallets;

    try {
      setKeyOptions(keyOpts, advancedOptions);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      showErrorModal(err, text);
      return;
    }

    if (text.includes('xprv') || text.includes('tprv')) {
      const xPrivKey = text;
      importWallet({xPrivKey}, keyOpts);
    } else {
      const words = text;
      if (!isValidPhrase(words)) {
        logger.error('Incorrect words length');
        showErrorModal(new Error(t('The recovery phrase is invalid.')));
        return;
      }
      if (
        !derivationPathEnabled &&
        !recreateWallet &&
        !keyOpts.keyId &&
        !includeTestnetWallets &&
        !includeLegacyWallets
      ) {
        const existingKey = dispatch(
          findExistingRecoveryKey(words, keyOpts.passphrase),
        );
        if (existingKey) {
          if (route.params?.context === 'onboarding') {
            backupRedirect({
              context: 'onboarding',
              navigation,
              walletTermsAccepted,
              key: existingKey,
            });
            return;
          }
          dispatch(
            showBottomNotificationModal({
              type: 'info',
              title: t('Key already associated with an existing wallet'),
              message: existingKey.keyName ?? '',
              enableBackdropDismiss: true,
              actions: [
                {
                  text: t('Key Settings'),
                  primary: true,
                  action: () =>
                    navigation.navigate('KeySettings', {keyId: existingKey.id}),
                },
                {text: t('OK'), action: () => {}},
              ],
            }),
          );
          return;
        }
      }
      importWallet({words}, keyOpts);
    }
  };

  const scanFunds = async (key: Key) => {
    try {
      showOngoingProcess('IMPORT_SCANNING_FUNDS');
      logger.debug('[Scan funds] Get rates (1/4)...');
      await dispatch(startGetRates({force: true}));
      logger.debug('[Scan funds] Fix wallet addresses (2/4)...');
      // workaround for fixing wallets without receive address
      await fixWalletAddresses({
        appDispatch: dispatch,
        wallets: key.wallets,
      });
      logger.debug('[Scan funds] Update all wallet status for key (3/4)...');
      await dispatch(
        startUpdateAllWalletStatusForKey({
          key,
          force: true,
          createTokenWalletWithFunds: true,
        }),
      );
      logger.debug('[Scan Funds] Update portfolio balance (4/4)... Finished.');
      dispatch(updatePortfolioBalance());
      populateImportedKeyPortfolio({dispatch, key, logger});
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
    }
  };

  const importWallet = async (
    importData: {words?: string | undefined; xPrivKey?: string | undefined},
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      setImportButtonState('loading');
      showOngoingProcess('IMPORTING');
      await sleep(1000);
      const key = !derivationPathEnabled
        ? ((await dispatch<any>(startImportMnemonic(importData, opts))) as Key)
        : ((await dispatch<any>(
            startImportWithDerivationPath(importData, opts),
          )) as Key);
      await sleep(1000);
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));
      await scanFunds(key);
      setImportButtonState('success');
      await sleep(500);
      setImportButtonState(undefined);
      hideOngoingProcess();
      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });
      dispatch(
        Analytics.track('Imported Key', {
          context: route.params?.context || '',
          source: 'RecoveryPhrase',
        }),
      );
    } catch (caught: any) {
      const err: any = hidePhrase(caught);
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      setImportButtonState('failed');
      await sleep(500);
      setImportButtonState(undefined);
      hideOngoingProcess();
      await sleep(600);
      showErrorModal(err, importData.words ?? importData.xPrivKey);
      return;
    }
  };

  const setOptsAndCreate = async (
    text: string,
    advancedOpts: {
      derivationPath: string;
      coin: string;
      chain: string;
      passphrase: string | undefined;
      isMultisig: boolean;
    },
  ): Promise<void> => {
    try {
      let keyOpts: Partial<KeyOptions> = {
        name: dispatch(GetName(advancedOpts.coin!, advancedOpts.chain)),
      };

      try {
        setKeyOptions(keyOpts, advancedOpts);
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(errMsg);
        showErrorModal(err, text);
        return;
      }

      if (text.includes('xprv') || text.includes('tprv')) {
        keyOpts.extendedPrivateKey = text;
        keyOpts.seedType = 'extendedPrivateKey';
      } else {
        keyOpts.mnemonic = normalizeMnemonic(text);
        keyOpts.seedType = 'mnemonic';
        if (!isValidPhrase(text)) {
          logger.error('Incorrect words length');
          showErrorModal(new Error(t('The recovery phrase is invalid.')));
          return;
        }
      }

      showOngoingProcess('CREATING_KEY');
      await sleep(1000);

      const key = (await dispatch<any>(startCreateKeyWithOpts(keyOpts))) as Key;
      try {
        showOngoingProcess('IMPORT_SCANNING_FUNDS');
        await dispatch(startGetRates({force: true}));
        // workaround for fixing wallets without receive address
        await fixWalletAddresses({
          appDispatch: dispatch,
          wallets: key.wallets,
        });
        await dispatch(
          startUpdateAllWalletStatusForKey({
            key,
            force: true,
            createTokenWalletWithFunds: true,
          }),
        );
        await sleep(1000);
        await dispatch(updatePortfolioBalance());
      } catch {
        // ignore error
      }
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });
      hideOngoingProcess();
      setRecreateWallet(false);
    } catch (caught: any) {
      const err: any = hidePhrase(caught);
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      hideOngoingProcess();
      await sleep(500);
      showErrorModal(err, text);
      setRecreateWallet(false);
      return;
    }
  };

  const renderItem = useCallback(
    ({item}: {item: SupportedCurrencyOption}) => {
      const {currencyAbbreviation, currencyName, img, badgeUri, chain} = item;

      const onPress = () => {
        haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');

        const defaultCoin = `default${chain.toUpperCase()}`;
        // @ts-ignore
        const derivationPath = DefaultDerivationPath[defaultCoin];

        setSelectedCurrency(item);
        setCurrencyModalVisible(false);
        setAdvancedOptions({
          ...advancedOptions,
          coin: currencyAbbreviation,
          chain,
          derivationPath,
        });
      };

      return (
        <RowContainer
          testID="currency-selection-row"
          accessibilityLabel={t('Select Currency')}
          onPress={onPress}
          key={item.id}>
          <CurrencyColumn>
            <CurrencyImage img={img} badgeUri={badgeUri} />
          </CurrencyColumn>
          <CurrencyTitleColumn>
            <CurrencyTitle>{currencyName}</CurrencyTitle>
            <CurrencySubTitle>
              {formatCurrencyAbbreviation(currencyAbbreviation)}
            </CurrencySubTitle>
          </CurrencyTitleColumn>
        </RowContainer>
      );
    },
    [advancedOptions, t],
  );

  useEffect(() => {
    if (route.params?.importQrCodeData) {
      const phrase = readImportQrCode(route.params.importQrCodeData);
      navigation.setParams({importQrCodeData: undefined});
      if (phrase && textMode) {
        updateRecoveryPhraseFromExternalSource(phrase);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clearImport = () => {
      clearRecoveryPhrase();
      setAdvancedOptions(options => ({...options, passphrase: undefined}));
    };
    const unsubscribe = navigation.addListener('blur', clearImport);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') {
        clearImport();
      }
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [clearRecoveryPhrase, navigation]);

  const invalidChips = chips.filter(chip => !isEnglishRecoveryWord(chip));
  const phraseReady =
    (chips.length === 12 || chips.length === MAX_PHRASE_WORDS) &&
    !invalidChips.length &&
    !typed;
  const phraseStatus = phraseMessage
    ? {error: true, text: phraseMessage}
    : invalidChips.length === 1
    ? {
        error: true,
        text: t('“{{word}}” isn’t a recovery phrase word.', {
          word: invalidChips[0],
        }),
      }
    : invalidChips.length
    ? {
        error: true,
        text: t('{{number}} words aren’t recovery phrase words.', {
          number: invalidChips.length,
        }),
      }
    : pasted && (chips.length === 11 || chips.length === 23)
    ? {error: false, text: t('One word is missing.')}
    : null;
  const phraseHasError = !!phraseStatus?.error;
  const selectedInvalidChip =
    selectedChip !== null && !isEnglishRecoveryWord(chips[selectedChip])
      ? chips[selectedChip]
      : undefined;
  const suggestions = typed
    ? getEnglishWordsStartingWith(typed, SUGGESTION_COUNT)
    : selectedInvalidChip
    ? getNearestEnglishWords(selectedInvalidChip, SUGGESTION_COUNT)
    : [];
  const suggestionBar = (
    <ScrollView
      testID="phrase-suggestions"
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('Suggestions')}
      style={[
        styles.suggestionContainer,
        {backgroundColor: colors.screenBg, borderTopColor: colors.borderCard},
      ]}
      contentContainerStyle={styles.suggestionBar}>
      {suggestions.map(word => (
        <Pill
          key={word}
          size="lg"
          label={word}
          onPress={() => commitWord(word)}
        />
      ))}
    </ScrollView>
  );

  return (
    <ScrollViewContainer
      testID="recovery-phrase-view"
      onLayout={onPerformanceLayout}
      extraScrollHeight={90}
      keyboardShouldPersistTaps={'handled'}
      inputAccessoryView={
        !textMode && IS_IOS ? (
          <InputAccessoryView nativeID={suggestionsId}>
            {suggestionBar}
          </InputAccessoryView>
        ) : null
      }>
      <ContentView>
        <PerformanceProfiler
          id="RecoveryPhrase:intro"
          onRender={logReactProfiler}>
          {textMode ? (
            <Paragraph>
              {t(
                'Enter your recovery phrase (usually 12-words) in the correct order. Separate each word with a single space only (no commas or any other punctuation). For backup phrases in non-English languages: Some words may include special symbols, so be sure to spell all the words correctly.',
              )}
            </Paragraph>
          ) : (
            <BaseText style={[styles.intro, {color: colors.textDescription}]}>
              {t('Type or paste your 12 or 24 words, in order.')}
            </BaseText>
          )}
        </PerformanceProfiler>

        <PerformanceProfiler
          id="RecoveryPhrase:header"
          onRender={logReactProfiler}>
          <HeaderContainer>
            <ImportTitle>{t('Recovery phrase')}</ImportTitle>
            <View style={styles.counterRow}>
              {!textMode ? (
                <BaseText
                  testID="phrase-word-counter"
                  style={[
                    styles.counter,
                    {color: phraseReady ? colors.gain : colors.textDescription},
                  ]}>
                  {`${chips.length} / ${chips.length > 12 ? 24 : 12}`}
                </BaseText>
              ) : null}
              <ScanContainer
                testID="scan-button"
                accessibilityLabel={t('Scan QR code')}
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  dispatch(
                    Analytics.track('Open Scanner', {
                      context: 'RecoveryPhrase',
                    }),
                  );
                  navigation.navigate('ScanRoot', {
                    onScanComplete: data => {
                      applyScannedPhrase(data);
                    },
                  });
                }}>
                <ScanSvg />
              </ScanContainer>
            </View>
          </HeaderContainer>
        </PerformanceProfiler>

        <PerformanceProfiler
          id="RecoveryPhrase:controller"
          onRender={logReactProfiler}>
          {!textMode ? (
            <Pressable
              testID="phrase-chips-field"
              accessible={false}
              onPress={() => chipInputRef.current?.focus()}
              style={[
                styles.chipsField,
                {
                  borderColor: phraseHasError ? Caution : colors.inputBorder,
                  borderBottomWidth: chipsFocused || phraseHasError ? 2 : 0.75,
                  borderBottomColor: phraseHasError
                    ? Caution
                    : chipsFocused
                    ? colors.inputFocusBorder
                    : colors.inputBorder,
                  backgroundColor: phraseHasError
                    ? colors.inputErrorBg
                    : chipsFocused
                    ? colors.inputFocusBg
                    : colors.screenBg,
                },
              ]}>
              {chips.map((chip, index) => {
                const valid = isEnglishRecoveryWord(chip);
                const selected = selectedChip === index;
                return (
                  <Pressable
                    key={index}
                    testID={`phrase-chip-${index}`}
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    accessibilityLabel={
                      valid
                        ? t('Word {{position}}, {{word}}', {
                            position: index + 1,
                            word: chip,
                          })
                        : t(
                            'Word {{position}}, {{word}}, not a recovery phrase word',
                            {position: index + 1, word: chip},
                          )
                    }
                    onPress={() => {
                      setChipState(current => ({
                        ...current,
                        selectedChip: selected ? null : index,
                      }));
                      setTyped('');
                      chipInputRef.current?.focus();
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected
                          ? valid
                            ? Action
                            : Caution
                          : valid
                          ? 'transparent'
                          : Caution,
                        backgroundColor: valid
                          ? colors.surfaceMuted
                          : colors.inputErrorBg,
                      },
                    ]}>
                    <BaseText
                      style={[
                        styles.chipNumber,
                        {color: valid ? colors.textPrimary : Caution},
                      ]}>
                      {index + 1}
                    </BaseText>
                    <BaseText
                      style={[
                        styles.chipWord,
                        valid
                          ? {color: colors.textPrimary}
                          : styles.chipWordInvalid,
                      ]}>
                      {chip}
                    </BaseText>
                  </Pressable>
                );
              })}
              <TextInput
                ref={chipInputRef}
                testID="phrase-word-input"
                accessibilityLabel={t('Word {{position}}', {
                  position: (selectedChip ?? chips.length) + 1,
                })}
                style={[styles.chipInput, {color: colors.textPrimary}]}
                value={typed}
                placeholder={chips.length ? '' : t('Type or paste your phrase')}
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize={'none'}
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                textContentType={IS_IOS ? 'password' : undefined}
                keyboardType={IS_ANDROID ? 'visible-password' : undefined}
                importantForAutofill="no"
                inputAccessoryViewID={IS_IOS ? suggestionsId : undefined}
                submitBehavior="submit"
                onFocus={() => setChipsFocused(true)}
                onBlur={() => setChipsFocused(false)}
                onChangeText={onChipInputChange}
                onKeyPress={({nativeEvent}) =>
                  onChipInputKeyPress(nativeEvent.key)
                }
                onSubmitEditing={() => commitWord(typed)}
              />
              <View style={styles.pastePill}>
                <Pill
                  label={t('Paste')}
                  accessibilityLabel={t('Paste recovery phrase')}
                  onPress={pasteFromClipboard}
                />
              </View>
            </Pressable>
          ) : null}
          <ImportTextInput
            ref={wordsRef}
            testID="import-text-input"
            accessibilityLabel={t('Enter recovery phrase')}
            style={textMode ? undefined : styles.hiddenInput}
            multiline
            autoCapitalize={'none'}
            numberOfLines={3}
            onChangeText={updateRecoveryPhraseValue}
            onBlur={() => applyTextAutocorrect(getValues().text)}
            defaultValue=""
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType={IS_IOS ? 'password' : undefined}
            keyboardType={IS_ANDROID ? 'visible-password' : undefined}
            importantForAutofill="no"
          />
        </PerformanceProfiler>

        {!textMode && IS_ANDROID && chipsFocused ? suggestionBar : null}

        {!textMode && phraseStatus ? (
          <BaseText
            testID="phrase-status"
            accessibilityRole={phraseHasError ? 'alert' : undefined}
            style={[
              styles.status,
              {color: phraseHasError ? Caution : Warning},
            ]}>
            {phraseStatus.text}
          </BaseText>
        ) : null}

        {textMode && errors.text?.message ? (
          <ErrorText>{errors.text.message}</ErrorText>
        ) : null}

        {textMode ? (
          <CuationText>
            {t('This process may take a few minutes to complete.')}
          </CuationText>
        ) : null}
        <PerformanceProfiler
          id="RecoveryPhrase:advanced-options"
          onRender={logReactProfiler}>
          <CtaContainer>
            <AdvancedOptionsContainer testID="advanced-options-container">
              <AdvancedOptionsButton
                testID="show-advanced-options"
                accessibilityLabel={t('Show Advanced Options')}
                onPress={() => {
                  Haptic('impactLight');
                  setShowAdvancedOptions(!showAdvancedOptions);
                }}>
                {showAdvancedOptions ? (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Hide Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronUpSvg />
                  </>
                ) : (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Show Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronDownSvg />
                  </>
                )}
              </AdvancedOptionsButton>
              {showAdvancedOptions && !derivationPathEnabled && (
                <AdvancedOptions>
                  <RowContainer
                    activeOpacity={1}
                    onPress={() => {
                      setIncludeTestnetWallets(!includeTestnetWallets);
                    }}>
                    <Column>
                      <OptionTitle>{t('Include Testnet Wallets')}</OptionTitle>
                    </Column>
                    <CheckBoxContainer
                      testID="include-testnet-wallet-checkbox"
                      accessibilityLabel={t('Include Testnet Wallets')}>
                      <Checkbox
                        checked={includeTestnetWallets}
                        onPress={() => {
                          setIncludeTestnetWallets(!includeTestnetWallets);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
              {showAdvancedOptions && !derivationPathEnabled && (
                <AdvancedOptions>
                  <RowContainer
                    activeOpacity={1}
                    onPress={() => {
                      setIncludeLegacyWallets(!includeLegacyWallets);
                    }}>
                    <Column>
                      <OptionTitle>{t('Include Legacy Wallets')}</OptionTitle>
                    </Column>
                    <CheckBoxContainer
                      testID="include-legacy-wallet-checkbox"
                      accessibilityLabel={t('Include Legacy Wallets')}>
                      <Checkbox
                        checked={includeLegacyWallets}
                        onPress={() => {
                          setIncludeLegacyWallets(!includeLegacyWallets);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
              {showAdvancedOptions && (
                <AdvancedOptions>
                  <RowContainer
                    testID="import-as-text-option"
                    activeOpacity={1}
                    onPress={toggleTextMode}>
                    <Column>
                      <OptionTitle>
                        {t('Enter Phrase or Key as Text')}
                      </OptionTitle>
                    </Column>
                    <CheckBoxContainer
                      testID="import-as-text-checkbox"
                      accessibilityLabel={t('Enter Phrase or Key as Text')}>
                      <Checkbox checked={textMode} onPress={toggleTextMode} />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
              {showAdvancedOptions && (
                <AdvancedOptions>
                  <RowContainer
                    activeOpacity={1}
                    onPress={() => {
                      setDerivationPathEnabled(!derivationPathEnabled);
                    }}>
                    <Column>
                      <OptionTitle>{t('Specify Derivation Path')}</OptionTitle>
                    </Column>
                    <CheckBoxContainer
                      testID="specify-derivation-path-checkbox"
                      accessibilityLabel={t('Specify Derivation Path')}>
                      <Checkbox
                        checked={derivationPathEnabled}
                        onPress={() => {
                          setDerivationPathEnabled(!derivationPathEnabled);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
              {showAdvancedOptions && derivationPathEnabled && (
                <AdvancedOptions>
                  <CurrencySelectorContainer>
                    <Label>{t('CURRENCY')}</Label>
                    <CurrencyContainer
                      testID="currency-container"
                      accessibilityLabel={t('Select Currency')}
                      activeOpacity={ActiveOpacity}
                      onPress={() => {
                        setCurrencyModalVisible(true);
                      }}>
                      <Row
                        style={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                          <CurrencyImage
                            img={selectedCurrency.img}
                            badgeUri={selectedCurrency.badgeUri}
                            size={30}
                          />
                          <CurrencyName>
                            {selectedCurrency?.currencyAbbreviation?.toUpperCase()}
                          </CurrencyName>
                        </View>
                        <Icons.DownToggle />
                      </Row>
                    </CurrencyContainer>
                  </CurrencySelectorContainer>
                </AdvancedOptions>
              )}
              <SheetModal
                isVisible={currencyModalVisible}
                unmountContentWhenHidden
                onBackdropPress={() => setCurrencyModalVisible(false)}>
                <CurrencySelectionModalContainer>
                  <TextAlign align={'center'}>
                    <H4>{t('Select a Coin')}</H4>
                  </TextAlign>
                  <FlatList
                    contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
                    data={CurrencyOptions}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                  />
                </CurrencySelectionModalContainer>
              </SheetModal>
              {showAdvancedOptions && derivationPathEnabled && (
                <AdvancedOptions>
                  <InputContainer>
                    <BoxInput
                      testID="derivation-path-box-input"
                      accessibilityLabel={t('Derivation Path')}
                      label={t('DERIVATION PATH')}
                      onChangeText={(text: string) =>
                        setAdvancedOptions({
                          ...advancedOptions,
                          derivationPath: text,
                        })
                      }
                      value={advancedOptions.derivationPath}
                    />
                  </InputContainer>
                </AdvancedOptions>
              )}
              {showAdvancedOptions &&
                derivationPathEnabled &&
                advancedOptions.derivationPath ===
                  DefaultDerivationPath.defaultBTC && (
                  <AdvancedOptions>
                    <RowContainer
                      activeOpacity={1}
                      onPress={() => {
                        setAdvancedOptions({
                          ...advancedOptions,
                          isMultisig: !advancedOptions.isMultisig,
                        });
                      }}>
                      <Column>
                        <OptionTitle>{t('Shared Wallet')}</OptionTitle>
                      </Column>
                      <CheckBoxContainer
                        testID="shared-wallet-checkbox"
                        accessibilityLabel={t('Shared Wallet')}>
                        <Checkbox
                          checked={advancedOptions.isMultisig}
                          onPress={() => {
                            setAdvancedOptions({
                              ...advancedOptions,
                              isMultisig: !advancedOptions.isMultisig,
                            });
                          }}
                        />
                      </CheckBoxContainer>
                    </RowContainer>
                  </AdvancedOptions>
                )}
              {showAdvancedOptions && (
                <AdvancedOptions>
                  <InputContainer>
                    <BoxInput
                      testID="password-input-box"
                      accessibilityLabel={t('Wallet password')}
                      placeholder={'strongPassword123'}
                      type={'password'}
                      onChangeText={(text: string) =>
                        setAdvancedOptions({
                          ...advancedOptions,
                          passphrase: text,
                        })
                      }
                      value={advancedOptions.passphrase}
                    />
                  </InputContainer>
                  <PasswordParagraph>
                    {t(
                      "This field is only for users who, in previous versions (it's not supported anymore), set a password to protect their recovery phrase. This field is not for your encrypt password.",
                    )}
                  </PasswordParagraph>
                </AdvancedOptions>
              )}
            </AdvancedOptionsContainer>
          </CtaContainer>
        </PerformanceProfiler>

        <PerformanceProfiler
          id="RecoveryPhrase:submit"
          onRender={logReactProfiler}>
          <Button
            testID="import-wallet-button"
            accessibilityLabel={t('Import Wallet')}
            buttonStyle={'primary'}
            state={importButtonState}
            disabled={!textMode && !phraseReady}
            onPress={() =>
              textMode ? handleSubmit(onSubmit)() : importChips()
            }>
            {t('Import Wallet')}
          </Button>
        </PerformanceProfiler>
      </ContentView>
    </ScrollViewContainer>
  );
};

export default RecoveryPhrase;
