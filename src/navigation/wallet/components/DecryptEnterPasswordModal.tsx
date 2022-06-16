import React, {useEffect} from 'react';
import Modal from 'react-native-modal';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import styled from 'styled-components/native';
import {AppActions} from '../../../store/app';
import {
  ActionContainer,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {LightBlack, White} from '../../../styles/colors';
import * as yup from 'yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {HeaderTitle, Paragraph} from '../../../components/styled/Text';
import {Keyboard} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';

const DecryptFormContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 16}px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 10px;
  padding: ${ScreenGutter};
`;

const schema = yup.object().shape({
  password: yup.string().required(),
});

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

const PasswordFormDescription = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
  margin: 10px 0;
`;

interface DecryptPasswordFieldValues {
  password: string;
}

export interface DecryptPasswordConfig {
  onSubmitHandler: (data: string) => void;
  onCancelHandler?: () => void;
  description?: string;
}

const DecryptEnterPasswordModal = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showDecryptPasswordModal,
  );
  const decryptPasswordConfig = useSelector(
    ({APP}: RootState) => APP.decryptPasswordConfig,
  );

  const {onSubmitHandler, onCancelHandler, description} =
    decryptPasswordConfig || {};

  const {
    control,
    handleSubmit,
    reset,
    formState: {errors},
  } = useForm<DecryptPasswordFieldValues>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (!isVisible) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const dismissModal = () => {
    dispatch(AppActions.dismissDecryptPasswordModal());
    setTimeout(() => {
      dispatch(AppActions.resetDecryptPasswordConfig());
    }, 500); // Wait for modal to close
    onCancelHandler && onCancelHandler();
  };

  const onSubmit = async ({password}: {password: string}) => {
    Keyboard.dismiss();
    await sleep(0);
    onSubmitHandler && onSubmitHandler(password);
  };

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      onBackdropPress={dismissModal}
      style={{
        alignItems: 'center',
      }}>
      <DecryptFormContainer>
        <PasswordFormContainer>
          <HeaderTitle>{t('Enter encryption password')}</HeaderTitle>

          {description ? (
            <PasswordFormDescription>{description}</PasswordFormDescription>
          ) : null}
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={'ENCRYPTION PASSWORD'}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.password?.message}
                  value={value}
                />
              )}
              name="password"
              defaultValue=""
            />
          </PasswordInputContainer>

          <ActionContainer>
            <Button onPress={handleSubmit(onSubmit)}>{t('Continue')}</Button>
          </ActionContainer>
          <ActionContainer>
            <Button onPress={dismissModal} buttonStyle={'secondary'}>
              {t('Cancel')}
            </Button>
          </ActionContainer>
        </PasswordFormContainer>
      </DecryptFormContainer>
    </Modal>
  );
};

export default DecryptEnterPasswordModal;
