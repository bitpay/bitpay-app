import React, {useEffect} from 'react';
import Modal from 'react-native-modal';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import styled from 'styled-components/native';
import {AppActions} from '../../../store/app';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {White} from '../../../styles/colors';
import * as yup from 'yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {Controller, useForm} from 'react-hook-form';
import {useTheme} from '@react-navigation/native';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

const DecryptFormContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 16}px;
  background-color: ${White};
  border-radius: 10px;
`;

const schema = yup.object().shape({
  password: yup.string().required(),
});

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

interface DecryptPasswordFieldValues {
  password: string;
}

export interface DecryptPasswordConfig {
  contextHandler: (data: string) => void;
}

const DecryptEnterPasswordModal = () => {
  const dispatch = useDispatch();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showDecryptPasswordModal,
  );
  const decryptPasswordConfig = useSelector(
    ({APP}: RootState) => APP.decryptPasswordConfig,
  );

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
  }, [isVisible]);

  const dismissModal = () => {
    dispatch(AppActions.dissmissDecryptPasswordModal());
  };
  const theme = useTheme();

  const onSubmit = ({password}: {password: string}) => {
    decryptPasswordConfig?.contextHandler(password);
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
        <ScrollView>
          <PasswordFormContainer>
            <PasswordInputContainer>
              <Controller
                control={control}
                render={({field: {onChange, onBlur, value}}) => (
                  <BoxInput
                    theme={theme}
                    placeholder={'strongPassword123'}
                    label={'ENTER ENCRYPT PASSWORD'}
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

            <Button onPress={handleSubmit(onSubmit)}>Ok</Button>
          </PasswordFormContainer>
        </ScrollView>
      </DecryptFormContainer>
    </Modal>
  );
};

export default DecryptEnterPasswordModal;
