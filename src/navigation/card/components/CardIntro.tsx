import React from 'react';
import {ScrollView, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import MastercardAngledImg from '../../../../assets/img/card/bitpay-card-mc-angled.svg';
import Button from '../../../components/button/Button';
import {
  ActionContainer,
  CtaContainerAbsolute,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {H3, Paragraph} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {RootState} from '../../../store';
import {AppEffects} from '../../../store/app';
import CardFeatureTabs from './CardIntroFeatureTabs';
import CardHighlights from './CardIntroHighlights';

const Spacer = styled.View<{height: number}>`
  height: ${({height}) => height}px;
`;

const ContentContainer = styled.View`
  padding: ${ScreenGutter};
`;

const IntroHero = () => {
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
          <H3>Fund it.</H3>

          <H3>Spend it.</H3>

          <H3>Live on crypto.</H3>
        </View>
      </View>
      <View>
        <View style={{alignItems: 'flex-start'}}>
          <MastercardAngledImg />
        </View>
      </View>
    </View>
  );
};

const CardIntro: React.FC = () => {
  const dispatch = useDispatch();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);

  const onGetCardPress = async (context?: 'login' | 'createAccount') => {
    const baseUrl = BASE_BITPAY_URLS[network];
    const path = 'wallet-card';
    let url = `${baseUrl}/${path}`;

    if (context) {
      url += `?context=${context}`;
    }

    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  return (
    <>
      <ScrollView>
        <ContentContainer>
          <IntroHero />

          <Spacer height={32} />

          <Paragraph>
            The fastest, easiest way to turn your crypto into dollars for
            shopping. Load funds in the BitPay App and spend in minutes.
          </Paragraph>

          <Spacer height={24} />

          {CardHighlights}

          <Spacer height={24} />

          <Paragraph>
            Shop online or in stores instantly with the virtual BitPay Prepaid
            Mastercard©, or order your physical card for free today.
          </Paragraph>
        </ContentContainer>

        <Spacer height={56} />

        {CardFeatureTabs}

        <Spacer height={200} />
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
            Sign Up
          </Button>
        </ActionContainer>

        <ActionContainer>
          <Button
            buttonStyle="secondary"
            onPress={() => onGetCardPress('login')}>
            I already have an account
          </Button>
        </ActionContainer>
      </CtaContainerAbsolute>
    </>
  );
};

export default CardIntro;
