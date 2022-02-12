import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, ScrollView, TextInput} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import * as yup from 'yup';
import AlertBox from '../../../components/alert-box/AlertBox';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, Link} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {Session} from '../../../store/bitpay-id/bitpay-id.models';
import {LoginStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {sleep} from '../../../utils/helper-methods';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';

export type LoginSignupParamList = {
  context: 'login' | 'signup';
  onLoginSuccess?: ((...args: any[]) => any) | undefined;
};

type LoginSignupScreenProps = StackScreenProps<
  AuthStackParamList,
  'LoginSignup'
>;

const ActionRowContainer = styled.View`
  margin-bottom: 32px;
`;

const Row = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const ActionText = styled(BaseText)`
  align-self: center;
  color: ${({theme}) => theme.colors.description};
  font-size: 18px;
`;

const schema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

interface LoginFormFieldValues {
  email: string;
  password: string;
}

const LoginSignup: React.FC<LoginSignupScreenProps> = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const session = useSelector<RootState, Session>(
    ({BITPAY_ID}) => BITPAY_ID.session,
  );
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );
  const loginError = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.loginError || '',
  );
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const captchaRef = useRef<CaptchaRef>(null);
  const {context, onLoginSuccess} = route.params;

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      dispatch(BitPayIdActions.completedPairing());

      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }

      const parentNav = navigation.getParent();

      if (parentNav?.canGoBack()) {
        parentNav.goBack();
      } else {
        navigationRef.navigate(RootStacks.BITPAY_ID, {
          screen: BitpayIdScreens.PROFILE,
        });
      }

      return;
    }

    if (loginStatus === 'failed') {
      // TODO
      captchaRef.current?.reset();
      return;
    }

    if (loginStatus === 'twoFactorPending') {
      navigation.navigate('TwoFactorAuthentication');
      return;
    }

    if (loginStatus === 'emailAuthenticationPending') {
      navigation.navigate('EmailAuthentication');
      return;
    }
  }, [loginStatus, navigation, dispatch, onLoginSuccess]);

  const onSubmit = handleSubmit(({email, password}) => {
    Keyboard.dismiss();
    if (session.captchaDisabled) {
      dispatch(BitPayIdEffects.startLogin({email, password}));
    } else {
      setCaptchaModalVisible(true);
    }
  });

  const onTroubleLoggingIn = () => {
    // TODO
    console.log('trouble logging in');
  };

  const onCaptchaResponse = async (gCaptchaResponse: string) => {
    const {email, password} = getValues();
    setCaptchaModalVisible(false);
    await sleep(500);
    dispatch(BitPayIdEffects.startLogin({email, password, gCaptchaResponse}));
  };

  const onCaptchaCancel = () => {
    haptic('notificationWarning');
    setCaptchaModalVisible(false);
  };

  return (
    <AuthFormContainer>
      <ScrollView>
        {loginStatus === 'failed' ? (
          <AuthRowContainer>
            <AlertBox type="warning">
              {loginError ||
                'Could not log in. Please review your information and try again.'}
            </AlertBox>
          </AuthRowContainer>
        ) : null}

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'satoshi@example.com'}
                label={'EMAIL'}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.email?.message}
                value={value}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="email"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                ref={passwordRef}
                placeholder={'strongPassword123'}
                label={'PASSWORD'}
                type={'password'}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.password?.message}
                value={value}
                onSubmitEditing={onSubmit}
              />
            )}
            name="password"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <ActionRowContainer>
            <Button onPress={onSubmit}>
              {context === 'login' ? 'Log In' : 'Create Account'}
            </Button>
          </ActionRowContainer>

          {context === 'login' ? (
            <>
              <ActionRowContainer>
                <ActionText>
                  Don't have an account?{' '}
                  <Link
                    onPress={() => navigation.setParams({context: 'signup'})}>
                    Create Account
                  </Link>
                </ActionText>
              </ActionRowContainer>

              <ActionRowContainer>
                <ActionText>
                  <Link onPress={() => onTroubleLoggingIn()}>
                    Trouble logging in?
                  </Link>
                </ActionText>
              </ActionRowContainer>
            </>
          ) : (
            <>
              <ActionRowContainer>
                <Row>
                  <ActionText>
                    Already have an account?{' '}
                    <Link
                      onPress={() => navigation.setParams({context: 'login'})}>
                      Log In
                    </Link>
                  </ActionText>
                </Row>
              </ActionRowContainer>
            </>
          )}
        </AuthActionsContainer>

        <RecaptchaModal
          isVisible={isCaptchaModalVisible}
          ref={captchaRef}
          sitekey={session.noCaptchaKey}
          baseUrl={BASE_BITPAY_URLS[network]}
          onResponse={onCaptchaResponse}
          onCancel={onCaptchaCancel}
        />
      </ScrollView>
    </AuthFormContainer>
  );
};

export default LoginSignup;
