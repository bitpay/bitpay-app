import React from 'react';
import {
  ImportTextInput,
  HeaderContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import styled from 'styled-components/native';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useForm, Controller} from 'react-hook-form';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {BaseText, ImportTitle} from '../../../components/styled/Text';
import {Caution} from '../../../styles/colors';
import {BwcProvider} from '../../../lib/bwc';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useNavigation, useRoute} from '@react-navigation/native';
import {startGetRates, startImportFile} from '../../../store/wallet/effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import {sleep} from '../../../utils/helper-methods';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';

const BWCProvider = BwcProvider.getInstance();

const ContentView = styled(ScrollView)`
  margin: 0 ${ScreenGutter};
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 0;
`;

const FormRow = styled.View`
  margin-bottom: 24px;
`;

interface FileOrTextFieldValues {
  text: string;
  password: string;
}

const schema = yup.object().shape({
  text: yup.string().required(),
  password: yup.string().required(),
});

const FileOrText = () => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Import'>>();
  const walletTermsAccepted = useAppSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<FileOrTextFieldValues>({resolver: yupResolver(schema)});

  const importWallet = async (
    decryptBackupText: string,
    opts: Partial<KeyOptions>,
  ) => {
    try {
      await dispatch(startOnGoingProcessModal('IMPORTING'));
      // @ts-ignore
      const key = await dispatch<Key>(startImportFile(decryptBackupText, opts));

      await dispatch(startGetRates({}));
      await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
      await sleep(1000);
      await dispatch(updatePortfolioBalance());

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

  const onSubmit = handleSubmit(formData => {
    const {text, password} = formData;

    let opts: Partial<KeyOptions> = {};
    if (route.params?.keyId) {
      opts.keyId = route.params.keyId;
    }
    let decryptBackupText: string;
    try {
      decryptBackupText = BWCProvider.getSJCL().decrypt(password, text);
    } catch (e: any) {
      logger.error(`Import: could not decrypt file ${e.message}`);
      showErrorModal(t('Could not decrypt file, check your password'));
      return;
    }
    importWallet(decryptBackupText, opts);
  });

  return (
    <ContentView keyboardShouldPersistTaps={'handled'}>
      <FormRow>
        <HeaderContainer>
          <ImportTitle>{t('Backup plain text code')}</ImportTitle>
        </HeaderContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <ImportTextInput
              accessibilityLabel="import-text-input"
              multiline
              numberOfLines={5}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
          name="text"
          defaultValue=""
        />

        {errors.text?.message && <ErrorText>{errors.text.message}</ErrorText>}
      </FormRow>

      <FormRow>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              accessibilityLabel="password-box-input"
              label={t('PASSWORD')}
              placeholder={'strongPassword123'}
              type={'password'}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.password?.message}
            />
          )}
          name="password"
          defaultValue=""
        />
      </FormRow>

      <Button
        accessibilityLabel="import-wallet-button"
        buttonStyle={'primary'}
        onPress={onSubmit}>
        {t('Import Wallet')}
      </Button>
    </ContentView>
  );
};

export default FileOrText;
