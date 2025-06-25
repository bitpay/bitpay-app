import React, {useLayoutEffect, useRef, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {Caution, SlateDark, White} from '../../../styles/colors';
import yup from '../../../lib/yup';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {WalletActions} from '../../../store/wallet/index';
import {useLogger, useAppDispatch} from '../../../utils/hooks';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {TextInput} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Constants} from 'bitcore-wallet-client/ts_build/lib/common';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';

const EncryptPasswordContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Paragraph = styled(BaseText)`
  font-weight: normal;
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

const PasswordActionContainer = styled.View`
  margin-top: 20px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin: 5px auto;
`;

interface EncryptPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const CreateEncryptionPassword = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {
    params: {key},
  } = useRoute<RouteProp<WalletGroupParamList, 'CreateEncryptPassword'>>();

  const schema = yup.object().shape({
    password: yup.string().required(),
    confirmPassword: yup
      .string()
      .required()
      .oneOf([yup.ref('password')], t('Passwords must match')),
  });
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EncryptPasswordFieldValues>({
    resolver: yupResolver(schema),
  });

  const dispatch = useAppDispatch();
  const [genericError, setGenericError] = useState<string>('');
  const logger = useLogger();
  const confirmPasswordRef = useRef<TextInput>(null);
  const onSubmit = ({password}: {password: string}) => {
    try {
      if (key) {
        Object.values(Constants.ALGOS).forEach(algo => {
          try {
            logger.debug(
              `Encrypting private key for: ${key.keyName} - with algo: ${algo}`,
            );
            key.methods!.encrypt(password, undefined, algo);
          } catch (err) {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);
            if (errMsg && errMsg.includes('Could not encrypt')) {
              throw err;
            }
            logger.debug(`error decrypting with ${algo}: ${errMsg}`);
          }
        });
        dispatch(WalletActions.successEncryptOrDecryptPassword({key}));
        key.isPrivKeyEncrypted = checkPrivateKeyEncrypted(key);
        navigation.goBack();
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Password set'),
            message: t(
              'Your encryption password has been set. This key is now encrypted.',
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('GOT IT'),
                action: () => {
                  dispatch(dismissBottomNotificationModal());
                },
                primary: true,
              },
            ],
          }),
        );
        logger.debug('Key encrypted');
      } else {
        setGenericError(t('Something went wrong. Please try again.'));
      }
    } catch (e) {
      if (!e) {
        return;
      }
      setGenericError(t('Could not encrypt/decrypt group wallets: ') + e);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{t('Create Encryption Password')}</HeaderTitle>
      ),
    });
  });

  return (
    <EncryptPasswordContainer>
      <ScrollView>
        <Paragraph>
          {t(
            'Your wallet will be encrypted. Whenever you make a transaction, we will ask for the password. This cannot be recovered, so be sure to store it safely.',
          )}
        </Paragraph>

        <PasswordFormContainer>
          {!!genericError && <ErrorText>{genericError}</ErrorText>}
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('ENCRYPTION PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.password?.message}
                  value={value}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              )}
              name="password"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  ref={confirmPasswordRef}
                  placeholder={'strongPassword123'}
                  label={t('CONFIRM ENCRYPTION PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.confirmPassword?.message}
                  value={value}
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordActionContainer>
            <Button onPress={handleSubmit(onSubmit)}>
              {t('Save Encryption Password')}
            </Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>
    </EncryptPasswordContainer>
  );
};

export default CreateEncryptionPassword;
