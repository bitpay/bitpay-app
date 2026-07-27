import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useTheme} from '../../../contexts';
import {
  Caution,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  SlateDark,
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
  startCreateKeyWithOpts,
  startGetRates,
  startImportMnemonic,
  startImportWithDerivationPath,
} from '../../../store/wallet/effects';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ImportObj} from '../../../store/scan/scan.models';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
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
  StyleSheet,
  Text,
  TextInput,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
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
    height: 55,
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
});

const ScrollViewContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof KeyboardAwareScrollView>) => (
  <KeyboardAwareScrollView
    style={[styles.scrollViewContainer, style]}
    {...rest}
  />
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
  const navigation = useNavigation();
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
  const wordsRef = useRef<TextInput>(null);
  const sensitiveInputRefs = useRef([wordsRef]).current;
  const {clearSensitive} = useSensitiveRefClear(sensitiveInputRefs);

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
    clearSensitive();
    setValue('text', '');
  }, [clearSensitive, setValue]);

  const showErrorModal = (e: Error, submittedText?: string) => {
    if (e && e.message === 'WALLET_DOES_NOT_EXIST') {
      const text = submittedText ?? getValues().text;
      setOptsAndCreate(text, advancedOptions);
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Something went wrong'),
          message: e.message,
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

  const processImportQrCode = (code: string): void => {
    try {
      const parsedCode = code.split('|');
      const recoveryObj: ImportObj = {
        type: parsedCode[0],
        data: parsedCode[1],
        hasPassphrase: parsedCode[4] === 'true' ? true : false,
      };

      if (!isValidPhrase(recoveryObj.data)) {
        showErrorModal(new Error(t('The recovery phrase is invalid.')));
        return;
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
      updateRecoveryPhraseFromExternalSource(recoveryObj.data);
    } catch {
      showErrorModal(new Error('The recovery phrase is invalid.'));
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
    const {text} = formData;
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
    } catch (err: any) {
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
        keyOpts.mnemonic = text;
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
    } catch (err: any) {
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
          accessibilityLabel="Select currency"
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
    [advancedOptions],
  );

  useEffect(() => {
    if (route.params?.importQrCodeData) {
      processImportQrCode(route.params.importQrCodeData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') {
        clearRecoveryPhrase();
      }
    });
    return () => sub.remove();
  }, [clearRecoveryPhrase]);

  return (
    <ScrollViewContainer
      testID="recovery-phrase-view"
      accessibilityLabel="Recovery phrase view"
      onLayout={onPerformanceLayout}
      extraScrollHeight={90}
      keyboardShouldPersistTaps={'handled'}>
      <ContentView>
        <PerformanceProfiler
          id="RecoveryPhrase:intro"
          onRender={logReactProfiler}>
          <Paragraph>
            {t(
              'Enter your recovery phrase (usually 12-words) in the correct order. Separate each word with a single space only (no commas or any other punctuation). For backup phrases in non-English languages: Some words may include special symbols, so be sure to spell all the words correctly.',
            )}
          </Paragraph>
        </PerformanceProfiler>

        <PerformanceProfiler
          id="RecoveryPhrase:header"
          onRender={logReactProfiler}>
          <HeaderContainer>
            <ImportTitle>{t('Recovery phrase')}</ImportTitle>

            <ScanContainer
              testID="scan-button"
              accessibilityLabel="Scan QR code"
              activeOpacity={ActiveOpacity}
              onPress={() => {
                dispatch(
                  Analytics.track('Open Scanner', {
                    context: 'RecoveryPhrase',
                  }),
                );
                navigation.navigate('ScanRoot', {
                  onScanComplete: data => {
                    processImportQrCode(data);
                  },
                });
              }}>
              <ScanSvg />
            </ScanContainer>
          </HeaderContainer>
        </PerformanceProfiler>

        <PerformanceProfiler
          id="RecoveryPhrase:controller"
          onRender={logReactProfiler}>
          <ImportTextInput
            ref={wordsRef}
            testID="import-text-input"
            accessibilityLabel="Enter recovery phrase"
            multiline
            autoCapitalize={'none'}
            numberOfLines={3}
            onChangeText={updateRecoveryPhraseValue}
            defaultValue=""
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType={IS_IOS ? 'password' : undefined}
            keyboardType={IS_ANDROID ? 'visible-password' : undefined}
          />
        </PerformanceProfiler>

        {errors.text?.message && <ErrorText>{errors.text.message}</ErrorText>}

        <CuationText>
          {t('This process may take a few minutes to complete.')}
        </CuationText>
        <PerformanceProfiler
          id="RecoveryPhrase:advanced-options"
          onRender={logReactProfiler}>
          <CtaContainer>
            <AdvancedOptionsContainer
              testID="advanced-options-container"
              accessibilityLabel="Advanced options container">
              <AdvancedOptionsButton
                testID="show-advanced-options"
                accessibilityLabel="Show advanced options"
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
                      accessibilityLabel="Include testnet wallets">
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
                      accessibilityLabel="Include legacy wallets">
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
                    activeOpacity={1}
                    onPress={() => {
                      setDerivationPathEnabled(!derivationPathEnabled);
                    }}>
                    <Column>
                      <OptionTitle>{t('Specify Derivation Path')}</OptionTitle>
                    </Column>
                    <CheckBoxContainer
                      testID="specify-derivation-path-checkbox"
                      accessibilityLabel="Specify derivation path">
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
                      accessibilityLabel="Currency container"
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
                      accessibilityLabel="Derivation path"
                      label={'DERIVATION PATH'}
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
                        accessibilityLabel="Shared wallet">
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
                      accessibilityLabel="Wallet password"
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
            accessibilityLabel="Import wallet"
            buttonStyle={'primary'}
            state={importButtonState}
            onPress={handleSubmit(onSubmit)}>
            {t('Import Wallet')}
          </Button>
        </PerformanceProfiler>
      </ContentView>
    </ScrollViewContainer>
  );
};

export default RecoveryPhrase;
