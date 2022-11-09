import {useScrollToTop} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useLayoutEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import A from '../../../components/anchor/Anchor';
import Button from '../../../components/button/Button';
import {
  ActionContainer,
  Br,
  CtaContainerAbsolute,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  Exp,
  H3,
  Paragraph,
  Smallest,
  TextAlign,
} from '../../../components/styled/Text';
import {Network, URL} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {RootState} from '../../../store';
import {AppEffects} from '../../../store/app';
import {getAppsFlyerId} from '../../../utils/appsFlyer';
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

const IntroHero = () => {
  const {t} = useTranslation();
  return (
    <View style={{flexDirection: 'row'}}>
      <View
        style={{
          flexBasis: '40%',
          marginTop: 40,
          alignItems: 'flex-end',
          paddingRight: 40,
        }}>
        <View>
          <H3>{t('Fund it.')}</H3>

          <H3>{t('Spend it.')}</H3>

          <H3>{t('Live on crypto.')}</H3>
        </View>
      </View>
      <View>
        <View style={{alignItems: 'flex-start'}}>
          <CardIntroHeroImg />
        </View>
      </View>
    </View>
  );
};

const CardIntro: React.FC<CardIntroProps> = props => {
  const {navigation} = props;
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const insets = useSafeAreaInsets();

  const onGetCardPress = async (context: 'login' | 'createAccount') => {
    const baseUrl = BASE_BITPAY_URLS[network];
    const path = 'wallet-card';
    const afid = await getAppsFlyerId();

    let url = `${baseUrl}/${path}?context=${context}`;

    if (afid) {
      url += `&afid=${afid}`;
    }

    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={{
          marginTop: insets.top,
        }}>
        <ContentContainer>
          <IntroHero />

          <Spacer height={32} />

          <Paragraph>
            {t(
              'The fastest, easiest way to turn your crypto into dollars for shopping. Load funds in the BitPay App and spend in minutes.',
            )}
          </Paragraph>

          <Spacer height={24} />

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
    </>
  );
};

export default CardIntro;
