import React, {useEffect} from 'react';
import Button from '../../../components/button/Button';
import {StackScreenProps} from '@react-navigation/stack';
import {BitpayIdStackParamList} from '../BitpayIdStack';
import {useDispatch, useSelector} from 'react-redux';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {SlateDark} from '../../../styles/colors';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {RootState} from '../../../store';

type Props = StackScreenProps<BitpayIdStackParamList, 'LoginSignup'>;

const LoginContainer = styled.SafeAreaView`
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View`
  width: 100%;
  padding: 0 20px;
  margin: 25px 0;
`;

const HeaderText = styled(BaseText)`
  font-size: 25px;
  font-weight: 700;
  line-height: 34px;
`;

const FormContainer = styled.View`
  width: 100%;
  padding: 0 20px;
`;

const InputContainer = styled.View`
  margin: 15px 0;
`;

const CtaContainer = styled.View`
  margin-top: 20px;
`;

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

const SecondaryActionContainer = styled.View`
  width: 100%;
`;

const Row = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const LoginText = styled(BaseText)`
  color: ${SlateDark};
  font-size: 18px;
`;

const schema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

const LoginScreen = ({navigation, route}: Props) => {
  const dispatch = useDispatch();
  const {session, loginStatus} = useSelector(
    ({BITPAY_ID}: RootState) => BITPAY_ID,
  );
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      navigation.navigate('Profile');
      dispatch(BitPayIdActions.resetLogin());
    }
  }, [dispatch, loginStatus, navigation]);

  const onSubmit = (formData: {email: string; password: string}) => {
    if (!session || !session.csrfToken) {
      console.log('CSRF token not found.');
      return;
    }

    const action =
      context === 'login'
        ? BitPayIdEffects.startLogin(formData)
        : BitPayIdEffects.startCreateAccount(formData);
    dispatch(action);
  };

  const context = route.params?.context || 'login';
  const headerText = context === 'login' ? 'Welcome back!' : 'Create Account';

  return (
    <LoginContainer>
      <HeaderContainer>
        <HeaderText>{headerText}</HeaderText>
      </HeaderContainer>
      <FormContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'satoshi@nakamoto.com'}
                label={'EMAIL'}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.email?.message}
                value={value}
              />
            )}
            name="email"
            defaultValue=""
          />
        </InputContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'strongPassword123'}
                label={'PASSWORD'}
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
        </InputContainer>
        <CtaContainer>
          <PrimaryActionContainer>
            <Button onPress={handleSubmit(onSubmit)}>Continue</Button>
          </PrimaryActionContainer>
          <SecondaryActionContainer>
            {context === 'login' ? (
              <>
                <Button buttonType={'link'} onPress={handleSubmit(onSubmit)}>
                  Trouble logging in?
                </Button>
              </>
            ) : (
              <>
                <Row>
                  <LoginText>Already have an account?</LoginText>
                  <Button
                    buttonType={'link'}
                    onPress={() =>
                      navigation.replace('LoginSignup', {
                        context: 'login',
                      })
                    }>
                    Log in
                  </Button>
                </Row>
              </>
            )}
          </SecondaryActionContainer>
        </CtaContainer>
      </FormContainer>
    </LoginContainer>
  );
};

export default LoginScreen;
