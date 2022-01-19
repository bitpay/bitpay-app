import React from 'react';
import {
  ImportTextInput,
  ImportContainer,
  CtaContainer,
  HeaderTitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {KeyOptions} from '../../../store/wallet/wallet.models';
import {BaseText, ImportTitle} from '../../../components/styled/Text';
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

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const importWallet = async (
    decryptBackupText: string,
    opts: Partial<KeyOptions>,
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

  const onSubmit = (formData: {text: string; password: string}) => {
    const {text, password} = formData;

    let opts: Partial<KeyOptions> = {};
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

  return (
    <ImportContainer>
      <HeaderTitleContainer>
        <ImportTitle>Backup plain text code</ImportTitle>
      </HeaderTitleContainer>
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

      {errors?.text?.message && <ErrorText>Backup text is required.</ErrorText>}

      <HeaderTitleContainer>
        <ImportTitle>Password</ImportTitle>
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
        <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportContainer>
  );
};

export default FileOrText;
