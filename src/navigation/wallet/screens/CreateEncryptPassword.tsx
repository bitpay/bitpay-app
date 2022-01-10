import React, {useEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {Caution, SlateDark, White} from '../../../styles/colors';
import * as yup from 'yup';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {KeyMethods} from '../../../store/wallet/wallet.models';
import {WalletActions} from '../../../store/wallet/index';
import {useLogger} from '../../../utils/hooks';

const EncryptPasswordContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
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

const schema = yup.object().shape({
  password: yup.string().required(),
  confirmPassword: yup
    .string()
    .required('Confirm Password is required field')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

interface EncryptPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const CreateEncryptPassword = () => {
  const navigation = useNavigation();
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'CreateEncryptPassword'>>();

  const {id} = wallet;
  const {
    control,
    handleSubmit,
    formState: {errors, isValid},
  } = useForm<EncryptPasswordFieldValues>({
    resolver: yupResolver(schema),
    mode: 'onTouched',
  });

  const theme = useTheme();
  const dispatch = useDispatch();
  const [genericError, setGenericError] = useState<string>('');
  const keyMethods: KeyMethods | undefined = useSelector(
    ({WALLET}: RootState) => WALLET.keyMethods.find(key => key.id === id),
  );
  const logger = useLogger();
  const onSubmit = async ({password}: {password: string}) => {
    try {
      if (keyMethods) {
        // TODO: Update wallet name
        logger.debug('Encrypting private key for: Wallet 1');

        keyMethods.encrypt(password);
        await dispatch(
          WalletActions.successEncryptPassword({keyMethods: keyMethods}),
        );
        wallet.isPrivKeyEncrypted = keyMethods.isPrivKeyEncrypted();
        navigation.navigate('Wallet', {
          screen: 'WalletSettings',
          params: {wallet: wallet},
        });
        logger.debug('Key encrypted');
      } else {
        setGenericError('Something went wrong. Please try again.');
      }
    } catch (e) {
      if (!e) {
        return;
      }
      setGenericError(`Could not encrypt/decrypt group wallets: ${e}`);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Create Encrypt Password</HeaderTitle>,
    });
  });

  return (
    <EncryptPasswordContainer>
      <ScrollView>
        <Paragraph>
          Your wallet will be encrypted. Whenever you do a transaction, we will
          ask for the encrypt password. The encrypt password cannot be
          recovered, so be sure to safely store it.
        </Paragraph>

        <PasswordFormContainer>
          {!!genericError && <ErrorText>{genericError}</ErrorText>}
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  theme={theme}
                  placeholder={'strongPassword123'}
                  label={'ENCRYPT PASSWORD'}
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

          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  theme={theme}
                  placeholder={'strongPassword123'}
                  label={'CONFIRM ENCRYPT PASSWORD'}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.confirmPassword?.message}
                  value={value}
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordActionContainer>
            <Button onPress={handleSubmit(onSubmit)} disabled={!isValid}>
              Save Encrypt Password
            </Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>
    </EncryptPasswordContainer>
  );
};

export default CreateEncryptPassword;
