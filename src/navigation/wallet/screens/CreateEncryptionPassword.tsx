import React, {useLayoutEffect, useRef, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
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
import {BwcProvider} from '../../../lib/bwc';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';

const Constants = BwcProvider.getInstance().getConstants();

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  encryptPasswordContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  paragraph: {
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 22,
  },
  passwordFormContainer: {
    marginVertical: 15,
  },
  passwordInputContainer: {
    marginVertical: 15,
  },
  passwordActionContainer: {
    marginTop: 20,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    marginVertical: 5,
    marginHorizontal: 'auto' as any,
  },
});

const ScrollView: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.scrollView, style]} {...rest} />
);

const Paragraph: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const PasswordFormContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.passwordFormContainer}>{children}</View>;

const PasswordInputContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.passwordInputContainer}>{children}</View>;

const PasswordActionContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.passwordActionContainer}>{children}</View>;

const ErrorText: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <BaseText style={styles.errorText}>{children}</BaseText>
);

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
    <SafeAreaView style={styles.encryptPasswordContainer}>
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
    </SafeAreaView>
  );
};

export default CreateEncryptionPassword;
