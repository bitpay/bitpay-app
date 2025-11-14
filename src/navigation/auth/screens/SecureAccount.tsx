import React, {useLayoutEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../styles/colors';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import PasskeyPersonSetupIcon from '../../../../assets/img/passkey-person-setup.svg';
import PasskeyPersonSetupIconDark from '../../../../assets/img/passkey-person-setup-dark.svg';
import TwoFactorIcon from '../../../../assets/img/two-factor-icon.svg';
import TwoFactorIconDark from '../../../../assets/img/two-factor-icon-dark.svg';
import ChevronRight from '../../bitpay-id/components/ChevronRight';
import Button from '../../../components/button/Button';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {OnboardingScreens} from '../../onboarding/OnboardingGroup';
import {IntroScreens} from '../../intro/IntroGroup';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {getPasskeyCredentials, registerPasskey} from '../../../utils/passkey';
import {Session} from '../../../store/bitpay-id/bitpay-id.models';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  setPasskeyCredentials,
  setPasskeyStatus,
} from '../../../store/bitpay-id/bitpay-id.actions';
import {LogActions} from '../../../store/log';
import {useOngoingProcess} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';

const AccountSecurityScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: 0 ${ScreenGutter};
  padding-bottom: 100px;
`;

const HeaderTextContainer = styled.View`
  margin: 16px 0;
`;

const HeaderText = styled(Paragraph)`
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
`;

const CardPressable = styled(TouchableOpacity)`
  padding: 16px;
  background: transparent;
  border-width: 1px;
  border-radius: 12px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  margin-bottom: 16px;
`;

const CardTitleContainer = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const IconBadge = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  background: ${({theme: {dark}}) =>
    dark ? 'rgba(34, 64, 196, 0.25)' : '#ECEFFD'};
`;

const CardContent = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const TitleContainer = styled.View`
  flex-grow: 1;
  margin-left: 16px;
`;

const TitleText = styled(BaseText)`
  font-size: 16px;
  font-weight: 600;
`;

const Bullets = styled.View`
  display: flex;
  width: 80%;
`;

const BulletRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-top: 20px;
`;

const Dot = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: ${({theme: {dark}}) => (dark ? '#4989FF' : '#2240c4')};
  margin-right: 8px;
  margin-top: 7px;
`;

const BulletText = styled(BaseText)`
  font-size: 16px;
  line-height: 20px;
`;

const Chevron = styled.View`
  margin-left: 10px;
  padding-top: 2px;
`;

export const SecureAccountScreen = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {dark} = useTheme();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const network = useAppSelector(({APP}) => APP.network);
  const session: Session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const introCompleted = useAppSelector(({APP}) => APP.introCompleted);

  const onSkipPressRef = useRef(() => {
    const routesStack = [];
    if (onboardingCompleted) {
      routesStack.push(
        {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
        {name: BitpayIdScreens.PROFILE, params: {}},
      );
    } else if (introCompleted) {
      routesStack.push({name: OnboardingScreens.NOTIFICATIONS, params: {}});
    } else {
      routesStack.push({name: IntroScreens.START, params: {}});
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: routesStack,
      }),
    );
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="skip-button"
            buttonType={'pill'}
            onPress={onSkipPressRef.current}>
            {t('Skip')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const goToPasskeySetup = async () => {
    if (!user) {
      return;
    }
    showOngoingProcess('CREATING_PASSKEY');
    try {
      const registeredPasskey = await registerPasskey(
        user.email,
        network,
        session.csrfToken,
      );
      logManager.info(
        '[Onboarding] Passkey created: ',
        JSON.stringify(registeredPasskey),
      );
      dispatch(setPasskeyStatus(registeredPasskey));
      const {credentials} = await getPasskeyCredentials(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyCredentials(credentials));
      hideOngoingProcess();
      if (registeredPasskey) {
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Passkey created'),
            message: t('Your account is secure.'),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('Continue'),
                action: () => {
                  onSkipPressRef.current();
                },
              },
            ],
          }),
        );
      } else {
        dispatch(
          showBottomNotificationModal({
            type: 'error',
            title: t('Error creating passkey'),
            message: t('Could not create a passkey, please try again later.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Continue'),
                action: () => {
                  onSkipPressRef.current();
                },
              },
            ],
          }),
        );
      }
    } catch (e: any) {
      hideOngoingProcess();
      const eMsg = e.message || JSON.stringify(e);
      logManager.error('[Onboarding] Error creating passkey: ', eMsg);
      if (e.error !== 'UserCancelled' && !eMsg.includes('error 1001')) {
        dispatch(
          showBottomNotificationModal({
            type: 'error',
            title: t('Error creating passkey'),
            message: eMsg,
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {},
              },
            ],
          }),
        );
      }
    }
  };

  const goToTwoFactorSetup = () => {
    navigation.navigate(BitpayIdScreens.ENABLE_TWO_FACTOR);
  };

  return (
    <AccountSecurityScreenContainer>
      <ScrollView>
        <HeaderTextContainer>
          <HeaderText>
            {t(
              'To keep your account secure, choose how you want to sign in. You can always update your preferences later.',
            )}
          </HeaderText>
        </HeaderTextContainer>
        <CardPressable onPress={goToPasskeySetup}>
          <CardTitleContainer>
            <IconBadge>
              {dark ? (
                <PasskeyPersonSetupIconDark width={20} height={20} />
              ) : (
                <PasskeyPersonSetupIcon width={20} height={20} />
              )}
            </IconBadge>
            <TitleContainer>
              <TitleText numberOfLines={2}>
                Set Up a Passkey (Recommended)
              </TitleText>
            </TitleContainer>
          </CardTitleContainer>

          <CardContent>
            <Bullets>
              <BulletRow>
                <Dot />
                <BulletText>
                  Sign in with Face ID, Touch ID, or a security key
                </BulletText>
              </BulletRow>
              <BulletRow>
                <Dot />
                <BulletText>
                  No passwords needed for a faster, safer login
                </BulletText>
              </BulletRow>
            </Bullets>
            <Chevron>
              <ChevronRight />
            </Chevron>
          </CardContent>
        </CardPressable>

        <CardPressable onPress={goToTwoFactorSetup}>
          <CardTitleContainer>
            <IconBadge>
              {dark ? (
                <TwoFactorIconDark width={20} height={20} />
              ) : (
                <TwoFactorIcon width={20} height={20} />
              )}
            </IconBadge>
            <TitleContainer>
              <TitleText numberOfLines={2}>
                Set Up 2-Factor Authentication
              </TitleText>
            </TitleContainer>
          </CardTitleContainer>

          <CardContent>
            <Bullets>
              <BulletRow>
                <Dot />
                <BulletText>
                  Use an Authenticator app or SMS verification
                </BulletText>
              </BulletRow>
              <BulletRow>
                <Dot />
                <BulletText>
                  Adds an extra layer of security to your password
                </BulletText>
              </BulletRow>
            </Bullets>
            <Chevron>
              <ChevronRight />
            </Chevron>
          </CardContent>
        </CardPressable>
      </ScrollView>
    </AccountSecurityScreenContainer>
  );
};

export default SecureAccountScreen;
