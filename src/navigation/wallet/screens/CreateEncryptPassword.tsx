import React, {useEffect} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SlateDark, White} from '../../../styles/colors';
import * as yup from 'yup';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';

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
const schema = yup.object().shape({
  password: yup.string().required(),
  confirmPassword: yup
    .string()
    .required()
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

interface EncryptPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const CreateEncryptPassword = () => {
  const navigation = useNavigation();
  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletStackParamList, 'CreateEncryptPassword'>>();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EncryptPasswordFieldValues>({resolver: yupResolver(schema)});

  const theme = useTheme();

  const onSubmit = handleSubmit(({password, confirmPassword}) => {
    console.log(password);
    console.log(confirmPassword);
  });
  const keyMethods = useSelector(({WALLET}: RootState) =>
    WALLET.keyMethods.find(key => key.id === keyId),
  );
  console.log('--------------->');
  console.log(keyMethods);
  // console.log(fullKey.isPrivKeyEncrypted());
  // fullKey.encrypt('test');
  // console.log(fullKey.toObj());
  // console.log(fullKey.isPrivKeyEncrypted());
  // fullKey.decrypt('test');
  // console.log(fullKey.isPrivKeyEncrypted());

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
              default=""
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
              default=""
            />
          </PasswordInputContainer>

          <PasswordActionContainer>
            <Button onPress={onSubmit}>Save Encrypt Password</Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>
    </EncryptPasswordContainer>
  );
};

export default CreateEncryptPassword;
