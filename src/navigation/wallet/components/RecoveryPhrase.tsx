import React, {useCallback, useState} from 'react';
import styled from 'styled-components/native';
import {
  Caution,
  SlateDark,
  White,
  LightBlack,
  NeutralSlate,
} from '../../../styles/colors';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {
  ActiveOpacity,
  CtaContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useDispatch, useSelector} from 'react-redux';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {
  BaseText,
  ImportTitle,
  TextAlign,
  H4,
} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {
  startImportMnemonic,
  startImportWithDerivationPath,
} from '../../../store/wallet/effects';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ImportObj} from '../../../store/scan/scan.models';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {navigateToTermsOrOverview} from '../screens/Backup';
import {RootState} from '../../../store';
import {
  ImportTextInput,
  ImportContainer,
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
  RowContainer,
  Column,
  Row,
  ModalContainer,
} from '../../../components/styled/Containers';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {
  getDerivationStrategy,
  isValidDerivationPathCoin,
  parsePath,
  getAccount,
  getNetworkName,
} from '../../../utils/helper-methods';
import {DefaultDerivationPath} from '../../../constants/defaultDerivationPath';
import {startUpdateAllWalletBalancesForKey} from '../../../store/wallet/effects/balance/balance';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import Icons from '../components/WalletIcons';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import {FlatList} from 'react-native';
import {keyExtractor} from '../../../utils/helper-methods';
import CurrencySelectionRow, {
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';

const Gutter = '10px';
const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ImportParagraph = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  padding: ${Gutter};
  color: ${({theme}) => theme.colors.description};
`;

const PasswordParagraph = styled(BaseText)`
  margin: 0px 20px 20px 20px;
  color: ${({theme}) => theme.colors.description};
`;

const HeaderContainer = styled.View`
  padding: ${Gutter};
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

const ScanContainer = styled.TouchableOpacity`
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
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

const CurrencySelectionModalContainer = styled(ModalContainer)`
  padding: 15px;
  min-height: 200px;
`;

const RecoveryPhrase = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Import'>>();
  const walletTermsAccepted = useSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );
  const [showOptions, setShowOptions] = useState(false);
  const [derivationPathEnabled, setDerivationPathEnabled] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const currencyOptions = SupportedCurrencyOptions.filter(
    currency => !currency.isToken,
  );
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions[0]);

  const [options, setOptions] = useState({
    derivationPath: DefaultDerivationPath.defaultBTC as string,
    coin: currencyOptions[0].currencyAbbreviation,
    passphrase: undefined as string | undefined,
    isMultisig: false,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const showErrorModal = (e: string) => {
    setTimeout(() => {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: 'Something went wrong',
          message: e,
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }, 500);
  };

  const isValidPhrase = (words: string) => {
    return words && words.trim().split(/[\u3000\s]+/).length % 3 === 0;
  };

  const setImportOptions = (opts: Partial<KeyOptions>) => {
    opts.passphrase = options.passphrase;

    if (derivationPathEnabled) {
      const derivationPath = options.derivationPath;

      opts.networkName = getNetworkName(derivationPath);
      opts.derivationStrategy = getDerivationStrategy(derivationPath);
      opts.account = getAccount(derivationPath);

      /* TODO: opts.n is just used to determinate if the wallet is multisig (m/48'/xx) or single sig (m/44')
        we should change the name to 'isMultisig'.
        isMultisig is used to allow import old multisig wallets with derivation strategy = 'BIP44'
      */
      opts.n = options.isMultisig
        ? 2
        : opts.derivationStrategy == 'BIP48'
        ? 2
        : 1;

      opts.coin = options.coin.toLowerCase();

      // set opts.useLegacyPurpose
      if (parsePath(derivationPath).purpose == "44'" && opts.n > 1) {
        opts.useLegacyPurpose = true;
        logger.debug('Using 44 for Multisig');
      }

      // set opts.useLegacyCoinType
      if (opts.coin == 'bch' && parsePath(derivationPath).coinCode == "0'") {
        opts.useLegacyCoinType = true;
        logger.debug('Using 0 for BCH creation');
      }

      if (
        !opts.networkName ||
        !opts.derivationStrategy ||
        !Number.isInteger(opts.account)
      ) {
        throw new Error('Invalid derivation path');
      }

      if (!isValidDerivationPathCoin(options.derivationPath, opts.coin)) {
        throw new Error('Invalid derivation path for selected coin');
      }
    }
  };

  const onSubmit = (formData: {text: string}) => {
    const {text} = formData;

    let opts: Partial<KeyOptions> = {};

    try {
      setImportOptions(opts);
    } catch (e: any) {
      logger.error(e.message);
      showErrorModal(e.message);
      return;
    }

    if (text.includes('xprv') || text.includes('tprv')) {
      const xPrivKey = text;
      importWallet({xPrivKey}, opts);
    } else {
      const words = text;
      if (!isValidPhrase(words)) {
        logger.error('Incorrect words length');
        showErrorModal('The recovery phrase is invalid.');
        return;
      }
      importWallet({words}, opts);
    }
  };

  const importWallet = async (
    importData: {words?: string | undefined; xPrivKey?: string | undefined},
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.IMPORTING),
      );
      const key = !derivationPathEnabled
        ? // @ts-ignore
          await dispatch<Key>(startImportMnemonic(importData, opts))
        : // @ts-ignore
          await dispatch<Key>(startImportWithDerivationPath(importData, opts));

      await dispatch(startUpdateAllWalletBalancesForKey(key));

      navigateToTermsOrOverview({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });
    } catch (e: any) {
      logger.error(e.message);
      showErrorModal(e.message);
      return;
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  };

  const currencySelected = ({id}: CurrencySelectionToggleProps) => {
    const _selectedCurrency = currencyOptions.filter(
      currency => currency.id === id,
    );
    setSelectedCurrency(_selectedCurrency[0]);
    setCurrencyModalVisible(false);
    setOptions({...options, coin: _selectedCurrency[0].currencyAbbreviation});
  };

  const renderItem = useCallback(
    ({item}) => (
      <CurrencySelectionRow
        item={item}
        emit={currencySelected}
        key={item.id}
        removeCheckbox={true}
      />
    ),
    [],
  );
  return (
    <ScrollViewContainer>
      <ImportContainer>
        <ImportParagraph>
          Enter your recovery phrase (usually 12-words) in the correct order.
          Separate each word with a single space only (no commas or any other
          punctuation). For backup phrases in non-English languages: Some words
          may include special symbols, so be sure to spell all the words
          correctly.
        </ImportParagraph>

        <HeaderContainer>
          <ImportTitle>Recovery phrase</ImportTitle>

          <ScanContainer
            activeOpacity={ActiveOpacity}
            onPress={() =>
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  contextHandler: data => {
                    try {
                      const parsedCode = data.split('|');
                      const recoveryObj: ImportObj = {
                        type: parsedCode[0],
                        data: parsedCode[1],
                        network: parsedCode[2],
                        hasPassphrase: !!parsedCode[4],
                      };

                      if (!isValidPhrase(recoveryObj.data)) {
                        showErrorModal('The recovery phrase is invalid.');
                      } else {
                        setValue('text', recoveryObj.data);
                      }
                    } catch (err) {
                      showErrorModal('The recovery phrase is invalid.');
                    }
                  },
                },
              })
            }>
            <ScanSvg />
          </ScanContainer>
        </HeaderContainer>

        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <ImportTextInput
              multiline
              numberOfLines={5}
              onChangeText={(text: string) => onChange(text)}
              onBlur={onBlur}
              value={value}
            />
          )}
          name="text"
          defaultValue=""
        />

        {errors?.text?.message && (
          <ErrorText>Recovery phrase is required.</ErrorText>
        )}

        <CtaContainer>
          <AdvancedOptionsContainer>
            <AdvancedOptionsButton
              onPress={() => {
                Haptic('impactLight');
                setShowOptions(!showOptions);
              }}>
              {showOptions ? (
                <>
                  <AdvancedOptionsButtonText>
                    Hide Advanced Options
                  </AdvancedOptionsButtonText>
                  <ChevronUpSvg />
                </>
              ) : (
                <>
                  <AdvancedOptionsButtonText>
                    Show Advanced Options
                  </AdvancedOptionsButtonText>
                  <ChevronDownSvg />
                </>
              )}
            </AdvancedOptionsButton>

            {showOptions && (
              <RowContainer
                style={{marginLeft: 10, marginRight: 10}}
                activeOpacity={1}
                onPress={() => {
                  setDerivationPathEnabled(!derivationPathEnabled);
                }}>
                <Column>
                  <OptionTitle>Specify Derivation Path</OptionTitle>
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
            )}

            {showOptions && derivationPathEnabled && (
              <CurrencySelectorContainer>
                <Label>CURRENCY</Label>
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
                        {selectedCurrency?.currencyAbbreviation}
                      </CurrencyName>
                    </Row>
                    <Icons.DownToggle />
                  </Row>
                </CurrencyContainer>
              </CurrencySelectorContainer>
            )}

            <BottomPopupModal
              isVisible={currencyModalVisible}
              onBackdropPress={() => setCurrencyModalVisible(false)}>
              <CurrencySelectionModalContainer>
                <TextAlign align={'center'}>
                  <H4>Select a Coin</H4>
                </TextAlign>
                <FlatList
                  contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
                  data={currencyOptions}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                />
              </CurrencySelectionModalContainer>
            </BottomPopupModal>

            {showOptions && derivationPathEnabled && (
              <AdvancedOptions>
                <BoxInput
                  label={'DERIVATION PATH'}
                  onChangeText={(text: string) =>
                    setOptions({...options, derivationPath: text})
                  }
                  value={options.derivationPath}
                />
              </AdvancedOptions>
            )}

            {showOptions &&
              derivationPathEnabled &&
              options.derivationPath === DefaultDerivationPath.defaultBTC && (
                <RowContainer
                  style={{marginLeft: 10, marginRight: 10}}
                  activeOpacity={1}
                  onPress={() => {
                    setOptions({...options, isMultisig: !options.isMultisig});
                  }}>
                  <Column>
                    <OptionTitle>Shared Wallet</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={options.isMultisig}
                      onPress={() => {
                        setOptions({
                          ...options,
                          isMultisig: !options.isMultisig,
                        });
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              )}

            {showOptions && (
              <>
                <AdvancedOptions>
                  <BoxInput
                    placeholder={'strongPassword123'}
                    type={'password'}
                    onChangeText={(text: string) =>
                      setOptions({...options, passphrase: text})
                    }
                    value={options.passphrase}
                  />
                </AdvancedOptions>
                <PasswordParagraph>
                  This field is only for users who, in previous versions (it's
                  not supported anymore), set a password to protect their
                  recovery phrase. This field is not for your encrypt password.
                </PasswordParagraph>
              </>
            )}
          </AdvancedOptionsContainer>
        </CtaContainer>

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            Import Wallet
          </Button>
        </CtaContainer>
      </ImportContainer>
    </ScrollViewContainer>
  );
};

export default RecoveryPhrase;
