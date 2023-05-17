import {yupResolver} from '@hookform/resolvers/yup';
import {useScrollToTop} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard, ScrollView, View} from 'react-native';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import A from '../../../components/anchor/Anchor';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {
  ActionContainer,
  Br,
  CtaContainerAbsolute,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {
  Exp,
  Paragraph,
  Smallest,
  TextAlign,
} from '../../../components/styled/Text';
import {Network, URL} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import yup from '../../../lib/yup';
import {RootState} from '../../../store';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import {getAppsFlyerId} from '../../../utils/appsFlyer';
import {useAppDispatch} from '../../../utils/hooks';
import {BaseText} from '../../wallet/components/KeyDropdownOption';
import {CardStackParamList} from '../CardStack';
import CardFeatureTabs from './CardIntroFeatureTabs';
import CardIntroHeroImg from './CardIntroHeroImage';
import CardHighlights from './CardIntroHighlights';

interface CardIntroProps {
  navigation: StackNavigationProp<CardStackParamList, 'CardHome'>;
}

const Spacer = styled.View<{height: number}>`
  height: ${({height}) => height}px;
`;

const ContentContainer = styled.View`
  padding: ${ScreenGutter};
`;

const IntroTitleContainer = styled.View`
  align-items: center;
  justify-content: center;
`;

const CardIntroImgContainer = styled.View`
  margin-top: -30px;
`;

const TitleText = styled(BaseText)`
  width: ${WIDTH * 1.2};
  text-align: center;
  font-size: 38.4px;
`;

const IntroHero = () => {
  const {t} = useTranslation();
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

const CardIntro: React.FC<CardIntroProps> = props => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const user = useSelector<RootState, User | null>(
    ({BITPAY_ID}) => BITPAY_ID.user[network],
  );

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EmailFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const onFormSubmit = handleSubmit(({email}) => {
    Keyboard.dismiss();
    // onSubmit(email);
  });

  const onGetCardPress = async (context: 'login' | 'createAccount') => {
    const baseUrl = BASE_BITPAY_URLS[network];
    const path = 'wallet-card';
    const afid = await getAppsFlyerId();

    let url = `${baseUrl}/${path}?context=${context}`;

    if (afid) {
      url += `&afid=${afid}`;
    }

    dispatch(openUrlWithInAppBrowser(url));
  };

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  return (
    <>
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

          {!user ? (
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
            <Button onPress={onFormSubmit}>{t('Join Waitlist')}</Button>
          </View>

          <Paragraph style={{textAlign: 'center', fontSize: 14}}>
            {t(
              'By submitting this form, you agree to receive marketing and other communications from BitPay. BitPay Card available to U.S. residents only.',
            )}
          </Paragraph>

          <Spacer height={42} />

          {CardHighlights()}

          <Spacer height={24} />

          <Paragraph>
            {t(
              'Shop online or in stores instantly with the virtual BitPay Prepaid Mastercard©, or order your physical card for free today.',
            )}
          </Paragraph>
        </ContentContainer>

        <Spacer height={56} />

        {CardFeatureTabs}

        <ContentContainer>
          <Paragraph>
            <A href={URL.PRIVACY_POLICY}>{t('Privacy Policy')}</A>
          </Paragraph>
        </ContentContainer>

        <ContentContainer>
          <Smallest>
            <Exp i={1} /> {t('Network fees and miner fees may apply.')}
          </Smallest>

          <Smallest>
            <Exp i={2} /> {t('Third party fees may apply.')}
          </Smallest>

          <Br />

          <Smallest>{t('TermsAndConditionsMastercard')}</Smallest>

          <Br />

          <Smallest>{t('TermsAndConditionsMastercard2')}</Smallest>
        </ContentContainer>

        <ContentContainer style={{marginBottom: 200}}>
          <TextAlign align="center">
            <A href={URL.MASTERCARD_CARDHOLDER_AGREEMENT} download>
              {t('Cardholder Agreement')}
            </A>
          </TextAlign>
        </ContentContainer>
      </ScrollView>

      {!user ? (
        <CtaContainerAbsolute
          background={true}
          style={{
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}>
          <ActionContainer>
            <Button onPress={() => onGetCardPress('createAccount')}>
              {t('Sign Up')}
            </Button>
          </ActionContainer>

          <ActionContainer>
            <Button
              buttonStyle="secondary"
              onPress={() => onGetCardPress('login')}>
              {t('I already have an account')}
            </Button>
          </ActionContainer>
        </CtaContainerAbsolute>
      ) : null}
    </>
  );
};

export default CardIntro;
