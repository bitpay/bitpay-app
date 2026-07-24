import React, {useEffect, useCallback, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {useTheme} from '../../../contexts';
import {AppActions} from '../../../store/app';
import {
  ActionContainer,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {LightBlack, White} from '../../../styles/colors';
import yup from '../../../lib/yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {HeaderTitle, Paragraph} from '../../../components/styled/Text';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import BaseModal from '../../../components/modal/base/BaseModal';

const styles = StyleSheet.create({
  decryptFormContainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: WIDTH - 16,
    borderRadius: 10,
    padding: parseInt(ScreenGutter, 10),
  },
  passwordFormContainer: {
    marginVertical: 15,
  },
  passwordInputContainer: {
    marginVertical: 15,
  },
  passwordFormDescription: {
    marginVertical: 10,
  },
});

const schema = yup.object().shape({
  password: yup.string().required(),
});

interface DecryptPasswordFieldValues {
  password: string;
}

export interface DecryptPasswordConfig {
  onSubmitHandler: (data: string) => void;
  onCancelHandler?: () => void;
  description?: string;
}

const DecryptEnterPasswordModal = React.memo(() => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showDecryptPasswordModal,
  );
  const decryptPasswordConfig = useSelector(
    ({APP}: RootState) => APP.decryptPasswordConfig,
  );

  const {onSubmitHandler, onCancelHandler, description} =
    decryptPasswordConfig || {};

  const resolver = useMemo(() => yupResolver(schema), []);

  const {
    control,
    handleSubmit,
    reset,
    formState: {errors},
  } = useForm<DecryptPasswordFieldValues>({
    resolver,
  });

  useEffect(() => {
    if (!isVisible) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const dismissModal = useCallback(() => {
    dispatch(AppActions.dismissDecryptPasswordModal());
    setTimeout(() => {
      dispatch(AppActions.resetDecryptPasswordConfig());
    }, 500); // Wait for modal to close
    onCancelHandler && onCancelHandler();
  }, [dispatch, onCancelHandler]);

  const onSubmit = useCallback(
    async ({password}: {password: string}) => {
      Keyboard.dismiss();
      await sleep(0);
      onSubmitHandler && onSubmitHandler(password);
    },
    [onSubmitHandler],
  );

  const renderPasswordInput = useCallback(
    ({field: {onChange, onBlur, value}}) => (
      <BoxInput
        label={'ENCRYPTION PASSWORD'}
        type={'password'}
        onBlur={onBlur}
        onChangeText={(text: string) => onChange(text)}
        error={errors.password?.message}
        value={value}
      />
    ),
    [errors.password?.message],
  );

  const handleSubmitMemoized = useMemo(
    () => handleSubmit(onSubmit),
    [handleSubmit, onSubmit],
  );

  const useNativeDriverValue = useMemo(() => Platform.OS === 'ios', []);

  return (
    <BaseModal
      testID="enter-encryption-password"
      accessibilityLabel="Enter encryption password"
      id={'enterEncryptionPassword'}
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      onBackdropPress={dismissModal}
      useNativeDriverForBackdrop={true}
      useNativeDriver={useNativeDriverValue}>
      <View
        style={[
          styles.decryptFormContainer,
          {backgroundColor: theme.dark ? LightBlack : White},
        ]}>
        <View style={styles.passwordFormContainer}>
          <HeaderTitle>{t('Enter encryption password')}</HeaderTitle>

          {description ? (
            <Paragraph
              style={[
                styles.passwordFormDescription,
                {color: theme.colors.text},
              ]}>
              {description}
            </Paragraph>
          ) : null}
          <View style={styles.passwordInputContainer}>
            <Controller
              control={control}
              render={renderPasswordInput}
              name="password"
              defaultValue=""
            />
          </View>

          <ActionContainer>
            <Button
              touchableLibrary={'react-native'}
              onPress={handleSubmitMemoized}>
              {t('Continue')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              touchableLibrary={'react-native'}
              onPress={dismissModal}
              buttonStyle={'secondary'}>
              {t('Cancel')}
            </Button>
          </ActionContainer>
        </View>
      </View>
    </BaseModal>
  );
});

export default DecryptEnterPasswordModal;
