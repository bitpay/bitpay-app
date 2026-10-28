import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../contexts';
import {
  Caution,
  SlateDark,
  White,
  Action,
  Slate30,
  LightBlack,
  LightBlue,
  Midnight,
  Feather,
  Disabled,
  DisabledDark,
  DisabledText,
  DisabledTextDark,
} from '../../../styles/colors';
import {
  BaseText,
  H5,
  H6,
  Link,
  InfoTitle,
  InfoHeader,
  InfoDescription,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {
  showBottomNotificationModal,
  setHomeCarouselConfig,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useForm, Controller, useWatch} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {KeyOptions, Status} from '../../../store/wallet/wallet.models';
import {CommonActions} from '@react-navigation/native';
import {
  Info,
  InfoTriangle,
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
  Column,
  ScreenGutter,
  CtaContainer as _CtaContainer,
  InfoImageContainer,
} from '../../../components/styled/Containers';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import Checkbox from '../../../components/checkbox/Checkbox';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {requestDklsWorkerMount} from '../../../dkls/DklsWorker';
import {
  startCreateKeyMultisig,
  startCreateTSSKey,
  addWalletMultisig,
  getDecryptPassword,
} from '../../../store/wallet/effects';
import InfoSvg from '../../../../assets/img/info.svg';
import PlusIcon from '../../../components/plus/Plus';
import MinusIcon from '../../../components/minus/Minus';
import {sleep} from '../../../utils/helper-methods';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {WrongPasswordError} from '../components/ErrorMessages';
import {URL} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {selectShowTestnetWallets} from '../../../store/wallet/utils/testnet';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {IsSegwitCoin} from '../../../store/wallet/utils/currency';
import {useOngoingProcess} from '../../../contexts';
import Banner from '../../../components/banner/Banner';

export interface CreateMultisigParamsList {
  context: 'addTSSWalletMultisig' | 'addWalletMultisig';
  currency: string;
  chain?: string;
  key?: Key;
}

const schema = yup.object().shape({
  name: yup.string().required().trim(),
  myName: yup.string().required().trim(),
  requiredSignatures: yup
    .number()
    .required()
    .positive()
    .integer()
    .min(1)
    .max(3)
    .test(
      'max-copayers',
      'Required signatures cannot exceed total co-signers',
      function (value) {
        const {totalCopayers} = this.parent;
        return !value || !totalCopayers || value <= totalCopayers;
      },
    ),
  totalCopayers: yup.number().required().positive().integer().min(2).max(6),
});

const SCREEN_GUTTER = Number(ScreenGutter.replace('px', ''));

const styles = StyleSheet.create({
  multisigContainer: {
    flex: 1,
  },
  scrollViewContainer: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
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
  verticalPadding: {
    paddingVertical: SCREEN_GUTTER,
    paddingHorizontal: 0,
  },
  counterContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  inputContainer: {
    marginTop: 20,
  },
  ctaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  signingRulesTitle: {
    marginTop: 30,
    marginBottom: 12,
  },
  signingRulesCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signingRule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
  },
  signingRuleLabel: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
  },
  signingRuleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  signingRuleValue: {
    minWidth: 44,
    textAlign: 'center',
  },
  signingRuleDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  signingRulesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  signerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginRight: 4,
  },
  signingRulesSummaryText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});

export const MultisigContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.multisigContainer, style]} {...rest} />
);

const ScrollViewContainer: React.FC<
  React.ComponentProps<typeof ScrollView>
> = ({style, ...rest}) => (
  <ScrollView style={[styles.scrollViewContainer, style]} {...rest} />
);

const ErrorText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.errorText, style]} {...rest} />;

const CheckBoxContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.checkBoxContainer, style]} {...rest} />;

const OptionTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.optionTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const VerticalPadding: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.verticalPadding, style]} {...rest} />;

const CounterContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.counterContainer, style]} {...rest} />;

const RowContainer: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.rowContainer, style]} {...rest} />;

const InputContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.inputContainer, style]} {...rest} />;

const CtaContainer: React.FC<React.ComponentProps<typeof _CtaContainer>> = ({
  style,
  ...rest
}) => <_CtaContainer style={[styles.ctaContainer, style]} {...rest} />;

const SigningRulesCard: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.signingRulesCard,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const SigningRuleDivider: React.FC = () => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.signingRuleDivider,
        {backgroundColor: theme.dark ? LightBlack : Slate30},
      ]}
    />
  );
};

const SigningRuleButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({disabled, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.signingRuleButton,
        {
          backgroundColor: disabled
            ? theme.dark
              ? DisabledDark
              : Disabled
            : theme.dark
            ? Midnight
            : LightBlue,
        },
        style,
      ]}
      {...rest}
    />
  );
};

interface SigningRuleProps {
  testID: string;
  label: string;
  value: number;
  canRemove: boolean;
  canAdd: boolean;
  onRemove: () => void;
  onAdd: () => void;
}

const SigningRule: React.FC<SigningRuleProps> = ({
  testID,
  label,
  value,
  canRemove,
  canAdd,
  onRemove,
  onAdd,
}) => {
  const theme = useTheme();
  const disabledIconColor = theme.dark ? DisabledTextDark : DisabledText;
  return (
    <View style={styles.signingRule}>
      <BaseText style={styles.signingRuleLabel}>{label}</BaseText>
      <CounterContainer>
        <SigningRuleButton
          testID={`${testID}-remove-button`}
          disabled={!canRemove}
          onPress={onRemove}>
          <MinusIcon color={canRemove ? undefined : disabledIconColor} />
        </SigningRuleButton>
        <H5 bold style={styles.signingRuleValue}>
          {value}
        </H5>
        <SigningRuleButton
          testID={`${testID}-add-button`}
          disabled={!canAdd}
          onPress={onAdd}>
          <PlusIcon color={canAdd ? undefined : disabledIconColor} />
        </SigningRuleButton>
      </CounterContainer>
    </View>
  );
};

interface SigningRulesSummaryProps {
  requiredSignatures: number;
  totalCopayers: number;
  summary: string;
}

const SigningRulesSummary: React.FC<SigningRulesSummaryProps> = ({
  requiredSignatures,
  totalCopayers,
  summary,
}) => {
  const theme = useTheme();
  const dotColor = theme.dark ? White : Action;
  return (
    <View
      style={[
        styles.signingRulesSummary,
        {backgroundColor: theme.dark ? LightBlack : Feather},
      ]}>
      {Array.from({length: totalCopayers}, (_, index) => (
        <View
          key={index}
          style={[
            styles.signerDot,
            {borderColor: dotColor},
            index < requiredSignatures && {backgroundColor: dotColor},
          ]}
        />
      ))}
      <BaseText
        style={[
          styles.signingRulesSummaryText,
          {color: theme.dark ? Slate30 : SlateDark},
        ]}>
        {summary}
      </BaseText>
    </View>
  );
};

type CreateMultisigProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.CREATE_MULTISIG
>;

const CreateMultisig: React.FC<CreateMultisigProps> = ({navigation, route}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {currency, chain, key, context} = route.params;
  const segwitSupported = IsSegwitCoin(currency);
  const showTestnetWallets = useAppSelector(selectShowTestnetWallets);
  const [showOptions, setShowOptions] = useState(false);
  const [testnetEnabled, setTestnetEnabled] = useState(false);
  const [regtestEnabled, setRegtestEnabled] = useState(false);
  const [options, setOptions] = useState({
    useNativeSegwit: segwitSupported,
    networkName: 'livenet',
    singleAddress: false,
  });

  const isTSS = context === 'addTSSWalletMultisig';

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: {errors, isSubmitting},
  } = useForm({resolver: yupResolver(schema)});
  const watchedRequiredSignatures = useWatch({
    control,
    name: 'requiredSignatures',
    defaultValue: 2,
  });
  const watchedTotalCopayers = useWatch({
    control,
    name: 'totalCopayers',
    defaultValue: 3,
  });
  const canRemoveSignature = watchedRequiredSignatures > 1;
  const canAddSignature =
    watchedRequiredSignatures < 3 &&
    watchedRequiredSignatures < watchedTotalCopayers;
  const canRemoveCopayer = watchedTotalCopayers > 2;
  const canAddCopayer = watchedTotalCopayers < 6;

  const setRequiredSignatures = (value: number) =>
    setValue('requiredSignatures', value, {shouldValidate: true});

  const setTotalCopayers = (value: number) => {
    setValue('totalCopayers', value, {shouldValidate: true});
    if (getValues('requiredSignatures') > value) {
      setRequiredSignatures(value);
    }
  };

  useEffect(() => {
    if (isTSS) {
      requestDklsWorkerMount();
    }
  }, [isTSS]);

  useEffect(() => {
    if (watchedRequiredSignatures !== watchedTotalCopayers) {
      return;
    }

    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Risk Warning'),
        message: t(
          'Using the max number of co-signers increases your risk. If any co-signer loses access, your funds will be permanently lost. BitPay cannot recover this wallet.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  }, [dispatch, t, watchedRequiredSignatures, watchedTotalCopayers]);

  const singleAddressCurrency =
    BitpaySupportedCoins[currency?.toLowerCase() as string]?.properties
      ?.singleAddress;

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
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
  };

  const onSubmit = async (formData: {
    name: string;
    myName: string;
    requiredSignatures: number;
    totalCopayers: number;
  }) => {
    try {
      let opts: Partial<KeyOptions> = {};
      if (key) {
        if (key.isPrivKeyEncrypted) {
          opts.password = await dispatch(getDecryptPassword(key));
        }
        showOngoingProcess('ADDING_WALLET');
      } else {
        showOngoingProcess('CREATING_KEY');
      }
      await sleep(500);
      const {name, myName, requiredSignatures, totalCopayers} = formData;

      opts.name = name;
      opts.myName = myName;
      opts.m = requiredSignatures;
      opts.n = totalCopayers;
      opts.useNativeSegwit = options.useNativeSegwit;
      opts.networkName = options.networkName;
      opts.singleAddress = options.singleAddress;
      opts.coin = currency?.toLowerCase();
      opts.chain = chain?.toLowerCase() || opts.coin;
      await CreateMultisigWallet(opts);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      hideOngoingProcess();
      await sleep(500);
      if (err && err.message && err.message === 'invalid password') {
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      } else {
        showErrorModal(errMsg);
      }
    }
  };

  const CreateTSSMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      const {key: tssKey} = await dispatch<any>(
        startCreateTSSKey({
          coin: opts.coin!,
          chain: opts.chain!,
          network: opts.networkName!,
          m: opts.m,
          n: opts.n,
          password: opts.password,
          myName: opts.myName,
          walletName: opts.name,
        }),
      );

      hideOngoingProcess();

      dispatch(
        Analytics.track('Started TSS Wallet Creation', {
          coin: currency?.toLowerCase(),
          type: `${opts.m}-${opts.n}`,
        }),
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: TabsScreens.HOME},
            },
            {
              name: WalletScreens.INVITE_COSIGNERS,
              params: {
                keyId: tssKey.id,
              },
            },
          ],
        }),
      );
    } catch (error: any) {
      hideOngoingProcess();
      await sleep(500);
      const e =
        (error && error.message) ||
        t('An unexpected error occurred while creating TSS Multisig Wallet.');
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Something went wrong'),
          message: e,
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

  const CreateMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    if (isTSS) {
      await CreateTSSMultisigWallet(opts);
      return;
    }

    if (key) {
      const wallet = (await dispatch<any>(
        addWalletMultisig({
          key,
          opts,
        }),
      )) as Wallet;
      dispatch(
        Analytics.track('Created Multisig Wallet', {
          coin: currency?.toLowerCase(),
          type: `${opts.m}-${opts.n}`,
          addedToExistingKey: true,
        }),
      );
      wallet.getStatus(
        {network: wallet.network},
        (err: any, status: Status) => {
          if (err) {
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  {
                    name: RootStacks.TABS,
                    params: {screen: TabsScreens.HOME},
                  },
                  {
                    name: WalletScreens.KEY_OVERVIEW,
                    params: {id: key.id},
                  },
                ],
              }),
            );
          } else {
            navigation.dispatch(
              CommonActions.reset({
                index: 2,
                routes: [
                  {
                    name: RootStacks.TABS,
                    params: {screen: TabsScreens.HOME},
                  },
                  {
                    name: WalletScreens.KEY_OVERVIEW,
                    params: {id: key.id},
                  },
                  {
                    name: WalletScreens.COPAYERS,
                    params: {wallet: wallet, status: status.wallet},
                  },
                ],
              }),
            );
          }
          hideOngoingProcess();
        },
      );
    } else {
      const multisigKey = (await dispatch<any>(
        startCreateKeyMultisig(opts),
      )) as Key;
      dispatch(
        Analytics.track('Created Multisig Wallet', {
          coin: currency?.toLowerCase(),
          type: `${opts.m}-${opts.n}`,
          addedToExistingKey: false,
        }),
      );
      dispatch(
        Analytics.track('Created Key', {
          context: 'createMultisig',
          coins: [currency?.toLowerCase()],
        }),
      );
      dispatch(setHomeCarouselConfig({id: multisigKey.id, show: true}));
      navigation.navigate('BackupKey', {
        context: 'createNewMultisigKey',
        key: multisigKey,
      });
      hideOngoingProcess();
    }
  };

  const toggleTestnet = () => {
    const _testnetEnabled = !testnetEnabled;
    setTestnetEnabled(_testnetEnabled);
    setRegtestEnabled(false);
    setOptions({
      ...options,
      networkName: _testnetEnabled ? 'testnet' : 'livenet',
    });
  };

  const toggleRegtest = () => {
    const _regtestEnabled = !regtestEnabled;
    setRegtestEnabled(_regtestEnabled);
    setTestnetEnabled(false);
    setOptions({
      ...options,
      networkName: _regtestEnabled ? 'regtest' : 'livenet',
    });
  };

  return (
    <MultisigContainer>
      <ScrollViewContainer
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled">
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={t('Wallet Name')}
                placeholder={t('e.g. Family Savings')}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.name?.message}
              />
            )}
            name="name"
            defaultValue=""
          />
        </InputContainer>

        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={t('Your Name')}
                placeholder={t('Visible to co-signers')}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.myName?.message}
              />
            )}
            name="myName"
            defaultValue=""
          />
        </InputContainer>

        <H6 style={styles.signingRulesTitle}>{t('Signing Rules')}</H6>
        <SigningRulesCard>
          <Controller
            control={control}
            render={({field: {value}}) => (
              <SigningRule
                testID="required-signatures"
                label={t('Required to sign')}
                value={value}
                canRemove={canRemoveSignature}
                canAdd={canAddSignature}
                onRemove={() => setRequiredSignatures(value - 1)}
                onAdd={() => setRequiredSignatures(value + 1)}
              />
            )}
            name="requiredSignatures"
            defaultValue={2}
          />
          <SigningRuleDivider />
          <Controller
            control={control}
            render={({field: {value}}) => (
              <SigningRule
                testID="total-copayers"
                label={t('Total co-signers')}
                value={value}
                canRemove={canRemoveCopayer}
                canAdd={canAddCopayer}
                onRemove={() => setTotalCopayers(value - 1)}
                onAdd={() => setTotalCopayers(value + 1)}
              />
            )}
            name="totalCopayers"
            defaultValue={3}
          />
          <SigningRulesSummary
            requiredSignatures={watchedRequiredSignatures}
            totalCopayers={watchedTotalCopayers}
            summary={t('Any {{m}} of {{n}} can approve', {
              m: watchedRequiredSignatures,
              n: watchedTotalCopayers,
            })}
          />
        </SigningRulesCard>

        {errors?.requiredSignatures?.message && (
          <ErrorText>{errors?.requiredSignatures?.message}</ErrorText>
        )}

        {errors?.totalCopayers?.message && (
          <ErrorText>{errors?.totalCopayers?.message}</ErrorText>
        )}

        {!isTSS && (
          <AdvancedOptionsContainer>
            <AdvancedOptionsButton
              onPress={() => {
                Haptic('impactLight');
                setShowOptions(!showOptions);
              }}>
              {showOptions ? (
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

            {showOptions && segwitSupported && (
              <AdvancedOptions>
                <RowContainer
                  onPress={() => {
                    setOptions({
                      ...options,
                      useNativeSegwit: !options.useNativeSegwit,
                    });
                  }}>
                  <Column>
                    <OptionTitle>Segwit</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={options.useNativeSegwit}
                      onPress={() => {
                        setOptions({
                          ...options,
                          useNativeSegwit: !options.useNativeSegwit,
                        });
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}
            {showOptions && showTestnetWallets && (
              <AdvancedOptions>
                <RowContainer
                  onPress={toggleTestnet}
                  onLongPress={toggleRegtest}>
                  <Column>
                    <OptionTitle>
                      {regtestEnabled ? 'Regtest' : 'Testnet'}
                    </OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={testnetEnabled || regtestEnabled}
                      onPress={toggleTestnet}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}

            {showOptions && !singleAddressCurrency && (
              <AdvancedOptions>
                <RowContainer
                  activeOpacity={1}
                  onPress={() => {
                    setOptions({
                      ...options,
                      singleAddress: !options.singleAddress,
                    });
                  }}>
                  <Column>
                    <OptionTitle>{t('Single Address')}</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={options.singleAddress}
                      onPress={() => {
                        setOptions({
                          ...options,
                          singleAddress: !options.singleAddress,
                        });
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>

                {options.singleAddress && (
                  <>
                    <Info style={{marginHorizontal: 10}}>
                      <InfoTriangle />

                      <InfoHeader>
                        <InfoImageContainer infoMargin={'0 8px 0 0'}>
                          <InfoSvg />
                        </InfoImageContainer>

                        <InfoTitle>{t('Single Address Wallet')}</InfoTitle>
                      </InfoHeader>
                      <InfoDescription>
                        {t(
                          'The single address feature will force the wallet to only use one address rather than generating new addresses.',
                        )}
                      </InfoDescription>

                      <VerticalPadding>
                        <TouchableOpacity
                          onPress={() => {
                            Haptic('impactLight');
                            dispatch(
                              openUrlWithInAppBrowser(URL.HELP_SINGLE_ADDRESS),
                            );
                          }}>
                          <Link>{t('Learn More')}</Link>
                        </TouchableOpacity>
                      </VerticalPadding>
                    </Info>
                  </>
                )}
              </AdvancedOptions>
            )}
          </AdvancedOptionsContainer>
        )}

        <Banner
          type={'info'}
          title={t('Back up your wallet')}
          description={t(
            'If {{count}} co-signers lose access, funds can’t be moved. BitPay can’t recover them.',
            {count: watchedTotalCopayers - watchedRequiredSignatures + 1},
          )}
        />
      </ScrollViewContainer>
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}>
          {t('Create Wallet')}
        </Button>
      </CtaContainer>
    </MultisigContainer>
  );
};

export default CreateMultisig;
