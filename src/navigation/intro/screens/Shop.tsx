import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import styled, {useTheme} from 'styled-components/native';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
import {RootStackParamList} from '../../../Root';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch} from '../../../utils/hooks';
import IntroButton from '../components/intro-button/IntroButton';
import {
  Body,
  IntroText,
  IntroTextBold,
  ButtonContainer,
  BodyContainer,
  IntroBackgroundImage,
  TopNavFill,
  TopNavFillOverlay,
  Overlay,
} from '../components/styled/Styled';

const lightBackground = require('../../../../assets/img/intro/light/shop-background.png');
const darkBackground = require('../../../../assets/img/intro/dark/shop-background.png');

const IntroShopContainer = styled.View`
  flex: 1;
`;

const TextContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

type IntroShopScreenProps = NativeStackScreenProps<RootStackParamList, 'Intro'>;

const IntroShop: React.VFC<IntroShopScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const onFinish = async () => {
    await dispatch(Analytics.initialize());
    await sleep(500);

    navigation.navigate('Tabs', {screen: 'Home'});
  };

  return (
    <IntroShopContainer>
      <FocusedStatusBar barStyle={'light-content'} />
      <Overlay />
      <TopNavFill />
      <TopNavFillOverlay />

      <IntroBackgroundImage
        source={theme.dark ? darkBackground : lightBackground}
        resizeMode="contain"
      />

      <Body>
        <BodyContainer>
          <TextContainer>
            <IntroText>
              {t('Shop with crypto and \nbuy gift cards in the')}
            </IntroText>
            <IntroTextBold>{t('Shop Tab.')}</IntroTextBold>
          </TextContainer>
        </BodyContainer>

        <ButtonContainer>
          <IntroButton onPress={onFinish}>{t('Finish')}</IntroButton>
        </ButtonContainer>
      </Body>
    </IntroShopContainer>
  );
};

export default IntroShop;
