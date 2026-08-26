import {yupResolver} from '@hookform/resolvers/yup';
import {useNavigation, useScrollToTop} from '@react-navigation/native';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {
  Keyboard,
  ScrollView,
  View,
  ViewProps,
  SafeAreaView,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import Button, {ButtonState} from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {ScreenGutter, WIDTH} from '../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import {BWCErrorMessage} from '../../../constants/BWCError';
import yup from '../../../lib/yup';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {joinWaitlist} from '../../../store/app/app.effects';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import CardIntroHeroImg from './CardIntroHeroImage';
import CardHighlights from './CardIntroHighlights';

const styles = StyleSheet.create({
  cardIntroContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: parseInt(ScreenGutter, 10),
  },
  introTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIntroImgContainer: {
    marginTop: -20,
  },
  titleText: {
    width: WIDTH * 1.2,
    textAlign: 'center',
    fontSize: WIDTH < 380 ? 32 : 38.4,
    marginBottom: WIDTH < 380 ? 3 : 0,
  },
});

const CardIntroContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.cardIntroContainer, style]} {...rest} />
);

const Spacer = ({height, style, ...rest}: ViewProps & {height: number}) => (
  <View style={[{height}, style]} {...rest} />
);

const ContentContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.contentContainer, style]} {...rest} />
);

const IntroTitleContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.introTitleContainer, style]} {...rest} />
);

const CardIntroImgContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.cardIntroImgContainer, style]} {...rest} />
);

const TitleText = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.titleText, style]} {...rest} />
));

const IntroHero = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
    });
  }, [navigation]);

  return (
    <IntroTitleContainer>
      <TitleText numberOfLines={1} ellipsizeMode={'clip'}>
        {t('Spend crypto like cash.')}
      </TitleText>
      <TitleText numberOfLines={1} ellipsizeMode={'clip'}>
        {t('Better than ever.')}
      </TitleText>

      <CardIntroImgContainer>
        <CardIntroHeroImg />
      </CardIntroImgContainer>
    </IntroTitleContainer>
  );
};

const schema = yup.object().shape({
  email: yup.string().email().required().trim(),
});

interface EmailFormFieldValues {
  email: string;
}

const CardIntro: React.FC = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const [buttonState, setButtonState] = useState<ButtonState>();
  const network = useAppSelector(({APP}) => APP.network);
  const isJoinedWaitlist = useAppSelector(({CARD}) => CARD.isJoinedWaitlist);
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const isUSResident = !locationData || locationData.countryShortCode === 'US';
  const [showEmailForm, setShowEmailForm] = useState<boolean>(isUSResident);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const {email: userEmail} = user || {};

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EmailFormFieldValues>({
    resolver: !userEmail ? yupResolver(schema) : undefined,
  });

  const onFormSubmit = handleSubmit(async ({email}) => {
    try {
      setButtonState('loading');
      Keyboard.dismiss();
      await dispatch(
        joinWaitlist(userEmail || email, 'CFSB Card Waitlist', 'bitpay-card'),
      );
      await sleep(500);
      setButtonState('success');
    } catch (err) {
      setButtonState('failed');

      logger.warn('Error joining waitlist: ' + BWCErrorMessage(err));
      await sleep(500);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Error joining waitlist'),
          }),
        ),
      );
      await sleep(500);
      setShowEmailForm(true);
      setButtonState(undefined);
    }
  });

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  const updateEmailForm = async () => {
    await sleep(1000);
    setShowEmailForm(!isJoinedWaitlist);
  };

  useEffect(() => {
    if (isUSResident) {
      updateEmailForm();
    }
  }, [isJoinedWaitlist, isUSResident]);

  return (
    <CardIntroContainer>
      <ScrollView ref={scrollViewRef}>
        <ContentContainer>
          <IntroHero />

          <Spacer height={32} />

          <Paragraph style={{textAlign: 'center'}}>
            {t(
              "We've temporarily paused new BitPay Card applications while we improve the crypto debit card program. Join our waitlist to get updates.",
            )}
          </Paragraph>
          <Spacer height={56} />

          {showEmailForm ? (
            <>
              {!userEmail ? (
                <View style={{marginBottom: 16}}>
                  <Controller
                    control={control}
                    render={({field: {onChange, onBlur, value}}) => (
                      <BoxInput
                        placeholder={'Enter Email'}
                        onBlur={onBlur}
                        onChangeText={(text: string) => onChange(text)}
                        error={errors.email?.message}
                        keyboardType={'email-address'}
                        value={value}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    )}
                    name="email"
                  />
                </View>
              ) : null}

              <View style={{marginBottom: 16}}>
                <Button state={buttonState} onPress={onFormSubmit}>
                  {t('Join Waitlist')}
                </Button>
              </View>

              <Paragraph style={{textAlign: 'center', fontSize: 14}}>
                {t(
                  'By submitting this form, you agree to receive marketing and other communications from BitPay. BitPay Card available to U.S. residents only.',
                )}
              </Paragraph>
            </>
          ) : (
            <>
              <Spacer height={42} />

              {isUSResident ? (
                <Paragraph style={{textAlign: 'center', fontSize: 14}}>
                  {t('You have joined the waitlist.')}
                </Paragraph>
              ) : (
                <Paragraph style={{textAlign: 'center', fontSize: 14}}>
                  {t(
                    'Waitlist unavailable. BitPay Card available to U.S. residents only.',
                  )}
                </Paragraph>
              )}

              <Spacer height={56} />
            </>
          )}

          <Spacer height={56} />

          {CardHighlights()}
        </ContentContainer>

        <Spacer height={56} />
      </ScrollView>
    </CardIntroContainer>
  );
};

export default CardIntro;
