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
import {startGetRates, startImportFile} from '../../../store/wallet/effects';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import {sleep} from '../../../utils/helper-methods';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';

const BWCProvider = BwcProvider.getInstance();

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

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
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
  } = useForm<FileOrTextFieldValues>({resolver: yupResolver(schema)});

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

      await dispatch(startGetRates({}));
      await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
      await dispatch(updatePortfolioBalance());
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

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
    <ScrollViewContainer>
      <ImportContainer>
        <FormRow>
          <HeaderContainer>
            <ImportTitle>{t('Backup plain text code')}</ImportTitle>
          </HeaderContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <ImportTextInput
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

          {errors?.text?.message && (
            <ErrorText>{t('Backup text is required.')}</ErrorText>
          )}
        </FormRow>

        <FormRow>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label="PASSWORD"
                placeholder={'strongPassword123'}
                type={'password'}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors?.password?.message && t('Password is required.')}
              />
            )}
            name="password"
            defaultValue=""
          />
        </FormRow>

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={onSubmit}>
            {t('Import Wallet')}
          </Button>
        </CtaContainer>
      </ImportContainer>
    </ScrollViewContainer>
  );
};

export default FileOrText;
