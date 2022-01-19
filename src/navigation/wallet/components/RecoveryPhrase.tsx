import React, {useState} from 'react';
import styled from 'styled-components/native';
import {Caution, SlateDark, White} from '../../../styles/colors';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {CtaContainer} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {BaseText, ImportTitle} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {KeyOptions} from '../../../store/wallet/wallet.models';
import {
  startImportMnemonic,
  startImportWithDerivationPath,
} from '../../../store/wallet/effects';
import {useNavigation} from '@react-navigation/native';
import {ImportObj} from '../../../store/scan/scan.models';
import {
  ImportTextInput,
  ImportContainer,
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
  RowContainer,
  Column,
} from '../../../components/styled/Containers';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {Dropdown} from 'react-native-element-dropdown';
import {SUPPORTED_TOKENS, Currencies} from '../../../constants/currencies';
import Checkbox from '../../../components/checkbox/Checkbox';
import {
  getDerivationStrategy,
  isValidDerivationPathCoin,
  parsePath,
  getAccount,
  getNetworkName,
} from '../../../utils/helper-methods';
import {DefaultDerivationPath} from '../../../constants/defaultDerivationPath';

const Gutter = '10px';
const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ImportParagraph = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  padding: ${Gutter};
  color: ${SlateDark};
`;

const PasswordParagraph = styled(BaseText)`
  margin: 0px 20px 20px 20px;
  color: ${SlateDark};
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

const DropDownContainer = styled.View`
  position: relative;
  padding: 10px 0;
`;

const Label = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  position: absolute;
  top: 0;
  left: 0;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const RecoveryPhrase = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const [derivationPathEnabled, setDerivationPathEnabled] = useState(false);
  const supportedCurrencies: {label: string; value: string}[] = [];
  for (let key in Currencies) {
    if (Currencies.hasOwnProperty(key) && !SUPPORTED_TOKENS.includes(key)) {
      supportedCurrencies.push({
        label: Currencies[key].name,
        value: Currencies[key].chain,
      });
    }
  }
  const [options, setOptions] = useState({
    derivationPath: DefaultDerivationPath.defaultBTC as string,
    coin: supportedCurrencies[0].value,
    passphrase: undefined as string | undefined,
    isMultisig: false,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      !derivationPathEnabled
        ? await dispatch(startImportMnemonic(importData, opts))
        : await dispatch(startImportWithDerivationPath(importData, opts));

      navigation.navigate('Onboarding', {
        screen: 'TermsOfUse',
      });
    } catch (e: any) {
      logger.error(e.message);
      showErrorModal(e.message);
      return;
    }
  };

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
            activeOpacity={0.75}
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
              <AdvancedOptions>
                <DropDownContainer>
                  <Label>COIN</Label>
                </DropDownContainer>
                <Dropdown
                  style={{
                    height: 50,
                    borderWidth: 1,
                    borderRadius: 4,
                    paddingHorizontal: 10,
                    borderColor: dropdownOpen ? 'blue' : '#e1e4e7',
                  }}
                  inputSearchStyle={{height: 55, fontSize: 16}}
                  data={supportedCurrencies}
                  search
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder={!dropdownOpen ? 'Select a coin' : '...'}
                  searchPlaceholder="Search..."
                  value={options.coin}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setDropdownOpen(false)}
                  onChange={item => {
                    setOptions({...options, coin: item.value});
                    setDropdownOpen(false);
                  }}
                />
              </AdvancedOptions>
            )}

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
