import React, {useState} from 'react';
import {URL} from '../../../../../constants';
import styled from 'styled-components/native';
import {Paragraph} from '../../../../../components/styled/Text';
import {SlateDark, White} from '../../../../../styles/colors';
import {useTranslation} from 'react-i18next';
import * as yup from 'yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../../components/form/BoxInput';
import {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
  CheckboxControl,
  CheckboxError,
  CheckboxLabel,
} from '../../../../auth/components/AuthFormContainer';
import {yupResolver} from '@hookform/resolvers/yup';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import A from '../../../../../components/anchor/Anchor';
import Button from '../../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {setEmailNotifications} from '../../../../../store/app/app.effects';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  ScreenGutter,
  Setting,
  SettingTitle,
  SettingDescription,
} from '../../../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';

const EmailNotificationsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const EmailNotificationsParagraph = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 15px;
`;

const EmailFormContainer = styled.View`
  margin: 15px 0;
`;

const VerticalSpace = styled.View`
  margin: 15px 0;
`;

const EmailFromUser = styled(SettingDescription)`
  margin: 0 0 10px 10px;
`;

const schema = yup.object().shape({
  email: yup.string().email().required(),
  agreedToTOSandPP: yup.boolean().oneOf([true], 'Required'),
  agreedToMarketingCommunications: yup.boolean(),
});

interface EmailNotificationsFieldValues {
  email: string;
  agreedToTOSandPP: boolean;
  agreedToMarketingCommunications: boolean;
}

const EmailNotifications = () => {
  const {t} = useTranslation();

  const {
    control,
    handleSubmit,
    formState: {errors},
    setValue,
  } = useForm<EmailNotificationsFieldValues>({resolver: yupResolver(schema)});

  const network = useAppSelector(({APP}) => APP.network);
  const emailNotifications = useAppSelector(({APP}) => APP.emailNotifications);
  const [notificationsAccepted, setNotificationsAccepted] = useState(
    !!emailNotifications?.accepted,
  );

  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const navigation = useNavigation();

  const dispatch = useAppDispatch();

  const onSubmit = handleSubmit(formData => {
    const {email, agreedToMarketingCommunications} = formData;
    dispatch(
      setEmailNotifications(true, email, agreedToMarketingCommunications),
    );
    setNotificationsAccepted(true);
  });

  const onPress = () => {
    const accepted = !notificationsAccepted;

    if (!accepted) {
      dispatch(setEmailNotifications(accepted, null, false));
      setNotificationsAccepted(accepted);
    } else {
      const {email} = user!;
      dispatch(setEmailNotifications(accepted, email, true));
      setNotificationsAccepted(accepted);
    }
  };

  const unsubscribeAll = () => {
    dispatch(setEmailNotifications(false, null, false));
    setNotificationsAccepted(false);
    navigation.goBack();
  };

  return (
    <>
      {!notificationsAccepted && !user ? (
        <EmailNotificationsContainer>
          <ScrollView>
            <EmailNotificationsParagraph>
              {t(
                'Provide your email address to receive occasional updates on new features and other relevant news.',
              )}
            </EmailNotificationsParagraph>

            <EmailFormContainer>
              <VerticalSpace>
                <AuthRowContainer>
                  <Controller
                    control={control}
                    render={({field: {onChange, onBlur, value}}) => (
                      <BoxInput
                        placeholder={'satoshi@example.com'}
                        label={t('EMAIL')}
                        onBlur={onBlur}
                        onChangeText={(text: string) => onChange(text)}
                        error={errors.email?.message}
                        value={value}
                      />
                    )}
                    name="email"
                    defaultValue=""
                  />
                </AuthRowContainer>
              </VerticalSpace>

              <AuthRowContainer>
                <Controller
                  control={control}
                  render={({field}) => (
                    <>
                      <CheckboxControl>
                        <Checkbox
                          onPress={() =>
                            setValue(
                              'agreedToMarketingCommunications',
                              !field.value,
                            )
                          }
                          checked={field.value}
                        />

                        <CheckboxLabel>
                          {t(
                            'I agree to receive marketing communications from BitPay.',
                          )}
                        </CheckboxLabel>
                      </CheckboxControl>
                    </>
                  )}
                  name="agreedToMarketingCommunications"
                  defaultValue={false}
                />
              </AuthRowContainer>

              <VerticalSpace>
                <AuthRowContainer>
                  <Controller
                    control={control}
                    render={({field}) => (
                      <>
                        <CheckboxControl>
                          <Checkbox
                            onPress={() =>
                              setValue('agreedToTOSandPP', !field.value)
                            }
                            checked={field.value}
                          />

                          <CheckboxLabel>
                            {t('I agree to the ')}
                            <A href={URL.TOU_BITPAY_ID}>
                              {t('Terms of Use')}
                            </A>{' '}
                            {t('and ')}
                            <A href={URL.PRIVACY_POLICY}>
                              {t('Privacy Policy')}
                            </A>
                            .
                          </CheckboxLabel>
                        </CheckboxControl>

                        {errors.agreedToTOSandPP ? (
                          <CheckboxControl>
                            <CheckboxError>
                              {errors.agreedToTOSandPP.message}
                            </CheckboxError>
                          </CheckboxControl>
                        ) : null}
                      </>
                    )}
                    name="agreedToTOSandPP"
                    defaultValue={false}
                  />
                </AuthRowContainer>
                <AuthActionsContainer>
                  <AuthActionRow>
                    <Button onPress={onSubmit}>{t('Subscribe')}</Button>
                  </AuthActionRow>
                </AuthActionsContainer>
                <Button
                  buttonType={'link'}
                  buttonStyle={'danger'}
                  onPress={unsubscribeAll}>
                  {t('Unsubscribe all Email Notifications')}
                </Button>
              </VerticalSpace>
            </EmailFormContainer>
          </ScrollView>
        </EmailNotificationsContainer>
      ) : (
        <SettingsContainer>
          <Settings>
            <Hr />

            <Setting onPress={onPress}>
              <SettingTitle>{t('Enable Email Notifications')}</SettingTitle>

              <Checkbox
                radio={true}
                onPress={onPress}
                checked={notificationsAccepted}
              />
            </Setting>
            {user && user.email ? (
              <EmailFromUser>{user.email}</EmailFromUser>
            ) : null}
            <Hr />
          </Settings>
        </SettingsContainer>
      )}
    </>
  );
};

export default EmailNotifications;
