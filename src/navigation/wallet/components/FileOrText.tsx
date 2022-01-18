import React, {useState} from 'react';
import {
  ImportWalletContainer,
  ImportWalletTextInput,
  ImportWalletTitle,
} from './RecoveryPhrase';
import {
  CtaContainer,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Haptic from '../../../components/haptic-feedback/haptic';
import {
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
} from '../../../components/styled/Containers';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {WalletOptions} from '../../../store/wallet/wallet.models';
import {BaseText} from '../../../components/styled/Text';
import {Caution} from '../../../styles/colors';
import {BwcProvider} from '../../../lib/bwc';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startImportFile} from '../../../store/wallet/effects';

const BWCProvider = BwcProvider.getInstance();

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const schema = yup.object().shape({
  text: yup.string().required(),
  password: yup.string().required(),
});

const InputContainer = styled.View`
  margin-top: -10px;
`;

const FileOrText = () => {
  const logger = useLogger();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [options, setOptions] = useState({
    bwsurl: 'https://bws.bitpay.com/bws/api',
  });
  const [showOptions, setShowOptions] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const importWallet = async (
    decryptBackupText: string,
    opts: Partial<WalletOptions>,
  ) => {
    try {
      await dispatch(startImportFile(decryptBackupText, opts));
      navigation.navigate('Onboarding', {
        screen: 'TermsOfUse',
      });
    } catch (e: any) {
      logger.error(e.message);
      showErrorModal(e.message);
      return;
    }
  };

  const showErrorModal = (e: string) =>
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

  const onSubmit = (formData: {text: string; password: string}) => {
    const {text, password} = formData;

    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$text', text);
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$password', password);

    let opts: Partial<WalletOptions> = {};
    opts.bwsurl = options.bwsurl;

    let decryptBackupText: string;
    try {
      decryptBackupText = BWCProvider.getSJCL().decrypt(password, text);
    } catch (e: any) {
      logger.error(`Import: could not decrypt file ${e.message}`);
      showErrorModal('Could not decrypt file, check your password');
      return;
    }
    importWallet(decryptBackupText, opts);
  };

  const _onPressShowOptions = () => {
    Haptic('impactLight');
    setShowOptions(!showOptions);
  };

  return (
    <ImportWalletContainer>
      <HeaderTitleContainer>
        <ImportWalletTitle>Backup plain text code</ImportWalletTitle>
      </HeaderTitleContainer>
      <Controller
        control={control}
        render={({field: {onChange, onBlur, value}}) => (
          <ImportWalletTextInput
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

      {errors?.text?.message && <ErrorText>Backup text is required.</ErrorText>}

      <HeaderTitleContainer>
        <ImportWalletTitle>Password</ImportWalletTitle>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <InputContainer>
              <BoxInput
                placeholder={'strongPassword123'}
                type={'password'}
                onChangeText={(password: string) => onChange(password)}
                onBlur={onBlur}
                value={value}
              />
            </InputContainer>
          )}
          name="password"
          defaultValue=""
        />

        {errors?.password?.message && (
          <ErrorText>Password is required.</ErrorText>
        )}
      </HeaderTitleContainer>

      <CtaContainer>
        {__DEV__ && (
          <AdvancedOptionsContainer>
            <AdvancedOptionsButton onPress={_onPressShowOptions}>
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
              <AdvancedOptions>
                <BoxInput
                  label={'WALLET SERVICE URL'}
                  onChangeText={(text: string) =>
                    setOptions({...options, bwsurl: text})
                  }
                  value={options.bwsurl}
                />
              </AdvancedOptions>
            )}
          </AdvancedOptionsContainer>
        )}

        <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportWalletContainer>
  );
};

export default FileOrText;