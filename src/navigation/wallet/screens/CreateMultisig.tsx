import React, {useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import {Caution, SlateDark, White, Action, Slate} from '../../../styles/colors';
import {
  Paragraph,
  BaseText,
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
import {useForm, Controller} from 'react-hook-form';
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
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {IsSegwitCoin, GetName} from '../../../store/wallet/utils/currency';
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
    .max(3),
  totalCopayers: yup.number().required().positive().integer().min(2).max(6),
});

export const MultisigContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 0;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const OptionTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const OptionContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const CounterContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RoundButton = styled.View`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin: 10px;
  border-radius: 30px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Action)};
`;

const RemoveButton = styled(TouchableOpacity)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 30px;
  border: 1px solid ${Slate};
`;

export const AddButton = styled(TouchableOpacity)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  width: 20px;
  border: 1px solid black;
  border-radius: 30px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Action)};
`;

const CounterNumber = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  font-size: 16px;
`;

const RowContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const InputContainer = styled.View`
  margin-top: 20px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

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
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

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

  const onSubmit = (formData: {
    name: string;
    myName: string;
    requiredSignatures: number;
    totalCopayers: number;
  }) => {
    const {name, myName, requiredSignatures, totalCopayers} = formData;

    let opts: Partial<KeyOptions> = {};
    opts.name = name;
    opts.myName = myName;
    opts.m = requiredSignatures;
    opts.n = totalCopayers;
    opts.useNativeSegwit = options.useNativeSegwit;
    opts.networkName = options.networkName;
    opts.singleAddress = options.singleAddress;
    opts.coin = currency?.toLowerCase();
    opts.chain = chain?.toLowerCase() || opts.coin;

    CreateMultisigWallet(opts);
  };

  const CreateTSSMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      showOngoingProcess('CREATING_KEY');

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
    } catch (e: any) {
      logger.error(e.message);
      hideOngoingProcess();
      await sleep(500);
      showErrorModal(e.message);
    }
  };

  const CreateMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      if (isTSS) {
        await CreateTSSMultisigWallet(opts);
        return;
      }

      if (key) {
        if (key.isPrivKeyEncrypted) {
          opts.password = await dispatch(getDecryptPassword(key));
        }
        showOngoingProcess('ADDING_WALLET');
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
        showOngoingProcess('CREATING_KEY');
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
    } catch (e: any) {
      logger.error(e.message);
      if (e.message === 'invalid password') {
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      } else {
        hideOngoingProcess();
        await sleep(500);
        showErrorModal(e.message);
        return;
      }
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
      <ScrollViewContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={t('WALLET NAME')}
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
                label={t('YOUR NAME')}
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

        <Controller
          control={control}
          render={({field: {value}}) => (
            <>
              <OptionContainer>
                <OptionTitle>{t('Required number of signatures')}</OptionTitle>
                <CounterContainer>
                  <RemoveButton
                    onPress={() => {
                      const newValue = value - 1;
                      if (newValue >= 1) {
                        setValue('requiredSignatures', newValue, {
                          shouldValidate: true,
                        });
                      }
                    }}>
                    <MinusIcon />
                  </RemoveButton>
                  <RoundButton>
                    <CounterNumber>{value}</CounterNumber>
                  </RoundButton>
                  <AddButton
                    onPress={() => {
                      const newValue = value + 1;
                      if (newValue <= 3) {
                        setValue('requiredSignatures', newValue, {
                          shouldValidate: true,
                        });
                      }
                    }}>
                    <PlusIcon />
                  </AddButton>
                </CounterContainer>
              </OptionContainer>
            </>
          )}
          name="requiredSignatures"
          defaultValue={2}
        />

        {errors?.requiredSignatures?.message && (
          <ErrorText>{errors?.requiredSignatures?.message}</ErrorText>
        )}

        <Controller
          control={control}
          render={({field: {value}}) => (
            <OptionContainer>
              <Column>
                <OptionTitle>{t('Total number of co-signers')}</OptionTitle>
              </Column>
              <CounterContainer>
                <RemoveButton
                  onPress={() => {
                    const newValue = value - 1;
                    if (newValue >= 2) {
                      setValue('totalCopayers', newValue, {
                        shouldValidate: true,
                      });
                    }
                  }}>
                  <MinusIcon />
                </RemoveButton>
                <RoundButton>
                  <CounterNumber>{value}</CounterNumber>
                </RoundButton>
                <AddButton
                  onPress={() => {
                    const newValue = value + 1;
                    if (newValue <= 6) {
                      setValue('totalCopayers', newValue, {
                        shouldValidate: true,
                      });
                    }
                  }}>
                  <PlusIcon />
                </AddButton>
              </CounterContainer>
            </OptionContainer>
          )}
          name="totalCopayers"
          defaultValue={3}
        />

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
            {showOptions && (
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
          title={t("Don't lose access")}
          description={t(
            "Your shared wallet uses an M-of-N setup. If the required number of co-signers are lost or unavailable, you will not be able to sign transactions or recover assets. Back up your wallet securely. BitPay can't recover your wallet or access your private keys.",
          )}
          link={{
            text: t('Learn More'),
            onPress: () => {},
          }}
        />

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            {t('Create Wallet')}
          </Button>
        </CtaContainer>
      </ScrollViewContainer>
    </MultisigContainer>
  );
};

export default CreateMultisig;
