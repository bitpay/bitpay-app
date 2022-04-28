import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, View} from 'react-native';
import * as yup from 'yup';
import Button, {ButtonState} from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, Link} from '../../../components/styled/Text';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {Card} from '../../../store/card/card.models';
import {Air} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthActionText,
  AuthRowContainer,
} from '../../auth/components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../../auth/components/RecaptchaModal';
import {CardActivationStackParamList} from '../CardActivationStack';

export type AuthScreenParamList = {
  card: Card;
};

const schema = yup.object().shape({
  password: yup.string().required(),
});

interface LoginFormFieldValues {
  password: string;
}

const AuthScreen: React.FC<
  StackScreenProps<CardActivationStackParamList, 'Authentication'>
> = ({navigation, route}) => {
  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const dispatch = useAppDispatch();
  const {card} = route.params;
  const email =
    useAppSelector(({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network]?.email) ||
    '';
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const network = useAppSelector(({APP}) => APP.network);
  const verifyAuthStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.verifyAuthStatus,
  );
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const captchaRef = useRef<CaptchaRef>(null);
  const [buttonState, setButtonState] = useState<ButtonState>(null);

  const onSubmit = handleSubmit(async ({password}) => {
    Keyboard.dismiss();
    setButtonState('loading');

    if (session.captchaDisabled) {
      dispatch(BitPayIdEffects.startVerifyAuth({email, password}));
    } else {
      setCaptchaModalVisible(true);
    }
  });

  const onTroubleLoggingIn = () => {
    // TODO
    console.log('TODO: trouble logging in');
  };

  const onCaptchaResponse = async (gCaptchaResponse: string) => {
    const {password} = getValues();
    setCaptchaModalVisible(false);
    await sleep(500);
    dispatch(
      BitPayIdEffects.startVerifyAuth({email, password, gCaptchaResponse}),
    );
  };

  const onCaptchaCancel = () => {
    haptic('notificationWarning');
    setCaptchaModalVisible(false);
  };

  useEffect(() => {
    if (verifyAuthStatus === 'success') {
      setButtonState('success');
      dispatch(BitPayIdActions.updateVerifyAuthStatus(null));
      setTimeout(() => {
        navigation.replace('Activate', {
          card,
        });
      }, 1000);
      return;
    } else if (verifyAuthStatus === 'failed') {
      // TODO
      setButtonState('failed');
      captchaRef.current?.reset();
      return;
    } else if (verifyAuthStatus === 'twoFactorPending') {
      setButtonState(null);
      navigation.replace('TwoFactorAuth', {
        card,
      });
      return;
    } else if (verifyAuthStatus === 'emailAuthenticationPending') {
      setButtonState(null);
      navigation.replace('TwoFactorEmail', {
        card,
      });
      return;
    }
  }, [verifyAuthStatus, navigation, dispatch]);

  return (
    <AuthFormContainer>
      <AuthRowContainer>
        <View
          style={{
            borderColor: Air,
            borderRadius: 40,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 15,
            marginBottom: 24,
          }}>
          <BaseText
            style={{
              fontSize: 16,
              fontWeight: '400',
              textAlign: 'center',
            }}>
            {email}
          </BaseText>
        </View>
      </AuthRowContainer>

      <AuthRowContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'strongPassword123'}
              label={'PASSWORD'}
              type={'password'}
              onBlur={onBlur}
              onChangeText={onChange}
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
        <AuthActionRow>
          <Button onPress={onSubmit} state={buttonState}>
            Log In
          </Button>
        </AuthActionRow>

        <AuthActionRow>
          <AuthActionText>
            <Link onPress={onTroubleLoggingIn}>Trouble logging in?</Link>
          </AuthActionText>
        </AuthActionRow>

        <RecaptchaModal
          isVisible={isCaptchaModalVisible}
          ref={captchaRef}
          sitekey={session.noCaptchaKey}
          baseUrl={BASE_BITPAY_URLS[network]}
          onResponse={onCaptchaResponse}
          onCancel={onCaptchaCancel}
        />
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default AuthScreen;
