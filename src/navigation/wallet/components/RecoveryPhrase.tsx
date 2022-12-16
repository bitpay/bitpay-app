import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  Caution,
  LightBlack,
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
  ScreenGutter,
  SheetContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useDispatch, useSelector} from 'react-redux';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {Controller, useForm} from 'react-hook-form';
import {
  BaseText,
  H4,
  ImportTitle,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {
  deferredImportMnemonic,
  startCreateKeyWithOpts,
  startGetRates,
  startImportWithDerivationPath,
} from '../../../store/wallet/effects';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ImportObj} from '../../../store/scan/scan.models';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {
  getAccount,
  getDerivationStrategy,
  getNetworkName,
  isValidDerivationPathCoin,
  keyExtractor,
  parsePath,
  sleep,
} from '../../../utils/helper-methods';
import {DefaultDerivationPath} from '../../../constants/defaultDerivationPath';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import Icons from '../components/WalletIcons';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {FlatList, ScrollView} from 'react-native';
import CurrencySelectionRow from '../../../components/list/CurrencySelectionRow';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {
  GetName,
  isSingleAddressCoin,
} from '../../../store/wallet/utils/currency';
import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

const ScrollViewContainer = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
`;

const ContentView = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

const PasswordParagraph = styled(BaseText)`
  margin: 0px 20px 20px 20px;
  color: ${({theme}) => theme.colors.description};
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const schema = yup.object().shape({
  text: yup.string().required(),
});

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const OptionTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Label = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  top: 0;
  left: 20px;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const CurrencySelectorContainer = styled.View`
  margin: 20px 0;
  position: relative;
`;

const CurrencyContainer = styled.TouchableOpacity`
  background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 0 20px;
  height: 55px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const CurrencyName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: 10px;
  color: #9ba3ae;
`;

const CurrencySelectionModalContainer = styled(SheetContainer)`
  padding: 15px;
  min-height: 200px;
`;

const CurrencyOptions = SupportedCurrencyOptions.filter(
  currency => !currency.isToken,
);

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const InputContainer = styled.View`
  padding: 18px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const RecoveryPhrase = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Import'>>();
  const walletTermsAccepted = useSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [derivationPathEnabled, setDerivationPathEnabled] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(CurrencyOptions[0]);
  const [recreateWallet, setRecreateWallet] = useState(false);

  const [advancedOptions, setAdvancedOptions] = useState({
    derivationPath: DefaultDerivationPath.defaultBTC as string,
    coin: CurrencyOptions[0].currencyAbbreviation,
    chain: CurrencyOptions[0].currencyAbbreviation, // chain = currency for all currencies if tokens not included
    passphrase: undefined as string | undefined,
    isMultisig: false,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
    getValues,
  } = useForm({resolver: yupResolver(schema)});

  const showErrorModal = (e: Error) => {
    if (e && e.message === 'WALLET_DOES_NOT_EXIST') {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t("We couldn't find your wallet"),
          message: t(
            'There are no records of your wallet on our servers. If you are importing a BIP44 compatible wallet from a 3rd party you can continue to recreate it. If you wallet is not BIP44 compatible, you will not be able to access its funds.',
          ),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Continue'),
              action: async () => {
                await sleep(500);
                if (derivationPathEnabled) {
                  const {text} = getValues();
                  setOptsAndCreate(text, advancedOptions);
                } else {
                  // select coin to create
                  setRecreateWallet(true);
                  setCurrencyModalVisible(true);
                }
              },
              primary: true,
            },
            {
              text: t('Go Back'),
              action: () => {},
              primary: false,
            },
          ],
        }),
      );
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
      setValue('text', recoveryObj.data);
    } catch (err) {
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
      keyOpts.singleAddress = dispatch(
        isSingleAddressCoin(advancedOpts.coin, advancedOpts.chain),
      );

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

      if (
        !isValidDerivationPathCoin(advancedOpts.derivationPath, keyOpts.coin)
      ) {
        throw new Error(t('Invalid derivation path for selected coin'));
      }
    }
  };

  const onSubmit = (formData: {text: string}) => {
    const {text} = formData;

    let keyOpts: Partial<KeyOptions> = {};

    try {
      setKeyOptions(keyOpts, advancedOptions);
    } catch (e: any) {
      logger.error(e.message);
      showErrorModal(e);
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

  const startDeferredImport = async (
    importData: {words?: string | undefined; xPrivKey?: string | undefined},
    opts: Partial<KeyOptions>,
  ) => {
    await sleep(0);
    dispatch(showOnGoingProcessModal(OnGoingProcessMessages.REDIRECTING));
    await sleep(350);

    let _context = route.params?.context;
    if (_context !== 'onboarding') {
      _context = 'deferredImport';
    }

    dispatch(deferredImportMnemonic(importData, opts, _context));
    dispatch(dismissOnGoingProcessModal());
    backupRedirect({
      context: _context,
      navigation,
      walletTermsAccepted,
    });
  };

  const importWallet = async (
    importData: {words?: string | undefined; xPrivKey?: string | undefined},
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      if (!derivationPathEnabled) {
        startDeferredImport(importData, opts);
        await sleep(500);
        dispatch(
          showBottomNotificationModal({
            type: 'wait',
            title: t('Please wait'),
            message: t(
              'Your key is still being imported and will be available shortly. ',
            ),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('GOT IT'),
                action: () => {},
                primary: true,
              },
            ],
          }),
        );
      } else {
        await dispatch(
          startOnGoingProcessModal(
            // t('Importing')
            t(OnGoingProcessMessages.IMPORTING),
          ),
        );
        const key = (await dispatch<any>(
          startImportWithDerivationPath(importData, opts),
        )) as Key;
        await dispatch(startGetRates({}));
        await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
        await sleep(1000);
        await dispatch(updatePortfolioBalance());
        dispatch(setHomeCarouselConfig({id: key.id, show: true}));
        backupRedirect({
          context: route.params?.context,
          navigation,
          walletTermsAccepted,
          key,
        });
        dispatch(
          logSegmentEvent('track', 'Imported Key', {
            context: route.params?.context || '',
            source: 'RecoveryPhrase',
          }),
        );
        dispatch(dismissOnGoingProcessModal());
      }
    } catch (e: any) {
      logger.error(e.message);
      dispatch(dismissOnGoingProcessModal());
      await sleep(600);
      showErrorModal(e);
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
      } catch (e: any) {
        logger.error(e.message);
        showErrorModal(e);
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

      await dispatch(
        startOnGoingProcessModal(
          // t('Creating Key')
          t(OnGoingProcessMessages.CREATING_KEY),
        ),
      );

      const key = (await dispatch<any>(startCreateKeyWithOpts(keyOpts))) as Key;
      await dispatch(startGetRates({}));
      await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
      await sleep(1000);
      await dispatch(updatePortfolioBalance());

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });
      dispatch(dismissOnGoingProcessModal());
      setRecreateWallet(false);
    } catch (e: any) {
      logger.error(e.message);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      showErrorModal(e);
      setRecreateWallet(false);
      return;
    }
  };

  const renderItem = useCallback(
    ({item}) => {
      const currencySelected = (id: string) => {
        const _selectedCurrency = CurrencyOptions.filter(
          currency => currency.currencyAbbreviation === id,
        );
        const currencyAbbreviation = _selectedCurrency[0].currencyAbbreviation;
        const defaultCoin = `default${currencyAbbreviation.toUpperCase()}`;
        // @ts-ignore
        const derivationPath = DefaultDerivationPath[defaultCoin];
        setSelectedCurrency(_selectedCurrency[0]);
        setCurrencyModalVisible(false);
        const advancedOpts = {
          ...advancedOptions,
          coin: currencyAbbreviation,
          chain: currencyAbbreviation, // chain = currency for all currencies if tokens not included
          derivationPath,
        };
        setAdvancedOptions(advancedOpts);

        // is trying to create wallet in bws
        if (recreateWallet) {
          const {text} = getValues();
          setOptsAndCreate(text, advancedOpts);
        }
      };

      return (
        <CurrencySelectionRow
          currency={item}
          onToggle={currencySelected}
          key={item.id}
          hideCheckbox={true}
        />
      );
    },
    [
      setSelectedCurrency,
      setCurrencyModalVisible,
      setAdvancedOptions,
      advancedOptions,
      recreateWallet,
      setRecreateWallet,
    ],
  );

  useEffect(() => {
    if (route.params?.importQrCodeData) {
      processImportQrCode(route.params.importQrCodeData);
    }
  }, []);

  return (
    <ScrollViewContainer
      extraScrollHeight={90}
      keyboardShouldPersistTaps={'handled'}>
      <ContentView keyboardShouldPersistTaps={'handled'}>
        <Paragraph>
          {t(
            'Enter your recovery phrase (usually 12-words) in the correct order. Separate each word with a single space only (no commas or any other punctuation). For backup phrases in non-English languages: Some words may include special symbols, so be sure to spell all the words correctly.',
          )}
        </Paragraph>

        <HeaderContainer>
          <ImportTitle>{t('Recovery phrase')}</ImportTitle>

          <ScanContainer
            activeOpacity={ActiveOpacity}
            onPress={() => {
              dispatch(
                logSegmentEvent('track', 'Open Scanner', {
                  context: 'RecoveryPhrase',
                }),
              );
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  onScanComplete: data => {
                    processImportQrCode(data);
                  },
                },
              });
            }}>
            <ScanSvg />
          </ScanContainer>
        </HeaderContainer>

        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <ImportTextInput
              multiline
              autoCapitalize={'none'}
              numberOfLines={3}
              onChangeText={(text: string) => onChange(text)}
              onBlur={onBlur}
              value={value}
              autoCorrect={false}
              spellCheck={false}
              textContentType={'password'}
            />
          )}
          name="text"
          defaultValue=""
        />

        {errors.text?.message && <ErrorText>{errors.text.message}</ErrorText>}

        <CtaContainer>
          <AdvancedOptionsContainer>
            <AdvancedOptionsButton
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
                  <CheckBoxContainer>
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
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      setCurrencyModalVisible(true);
                    }}>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <Row style={{alignItems: 'center'}}>
                        <CurrencyImage img={selectedCurrency.img} size={30} />
                        <CurrencyName>
                          {selectedCurrency?.currencyAbbreviation?.toUpperCase()}
                        </CurrencyName>
                      </Row>
                      <Icons.DownToggle />
                    </Row>
                  </CurrencyContainer>
                </CurrencySelectorContainer>
              </AdvancedOptions>
            )}

            <SheetModal
              isVisible={currencyModalVisible}
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
                    <CheckBoxContainer>
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
                    placeholder={'strongPassword123'}
                    type={'password'}
                    onChangeText={(text: string) =>
                      setAdvancedOptions({...advancedOptions, passphrase: text})
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

        <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
          {t('Import Wallet')}
        </Button>
      </ContentView>
    </ScrollViewContainer>
  );
};

export default RecoveryPhrase;
