import React from 'react';
import {
  ImportTextInput,
  ImportContainer,
  CtaContainer as _CtaContainer,
  HeaderContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {BaseText, ImportTitle} from '../../../components/styled/Text';
import {Caution} from '../../../styles/colors';
import {BwcProvider} from '../../../lib/bwc';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {startImportFile} from '../../../store/wallet/effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import {sleep} from '../../../utils/helper-methods';

const BWCProvider = BwcProvider.getInstance();

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const schema = yup.object().shape({
  text: yup.string().required(),
  password: yup.string().required(),
});

const InputContainer = styled.View`
  margin-top: -20px;
`;

const FileOrText = () => {
  const logger = useLogger();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Import'>>();
  const walletTermsAccepted = useSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );

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
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.IMPORTING),
      );
      // @ts-ignore
      const key = await dispatch<Key>(startImportFile(decryptBackupText, opts));
      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });
      dispatch(dismissOnGoingProcessModal());
    } catch (e: any) {
      logger.error(e.message);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      showErrorModal(e.message);
      return;
    }
  };

  const showErrorModal = (e: string) => {
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
    <ScrollViewContainer>
      <ImportContainer>
        <HeaderContainer>
          <ImportTitle>Backup plain text code</ImportTitle>
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
          <ErrorText>Backup text is required.</ErrorText>
        )}

        <HeaderContainer>
          <ImportTitle>Password</ImportTitle>
        </HeaderContainer>
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

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            Import Wallet
          </Button>
        </CtaContainer>
      </ImportContainer>
    </ScrollViewContainer>
  );
};

export default FileOrText;
