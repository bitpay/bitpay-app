import React from 'react';
import styled from 'styled-components/native';
import {BaseText, H2} from '../../../components/styled/Text';
import ArrowSvg from '../../../../assets/img/intro/balance-arrow.svg';
import IntroButton from '../components/intro-button/IntroButton';

import {
  BackgroundImage,
  Body,
  IntroText,
  IntroTextBold,
  ButtonContainer,
  Overlay,
} from '../components/styled/Styled';
import {useNavigation} from '@react-navigation/native';

const IntroBalanceContainer = styled.View`
  flex: 1;
`;

const PortfolioBalanceHeader = styled(BaseText)`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0px;
  text-align: left;
  color: white;
  margin-top: 30%;
  margin-left: 10px;
`;

const PortfolioBalanceAmount = styled(H2)`
  text-align: left;
  color: white;
  margin-left: 10px;
`;

const ArrowSvgContainer = styled.View`
  justify-content: center;
  align-items: center;
  margin-right: 25%;
`;

const BodyTextContainer = styled.View`
  margin-top: 20px;
  justify-content: center;
  align-items: center;
`;

const IntroBalance = () => {
  const navigation = useNavigation();

  return (
    <IntroBalanceContainer>
      <BackgroundImage
        source={require('../../../../assets/img/intro/light/balance-background.png')}
      />
      <Overlay />
      <Body>
        <PortfolioBalanceHeader>Portfolio Balance</PortfolioBalanceHeader>
        <PortfolioBalanceAmount>$44,603.01 USD</PortfolioBalanceAmount>
        <ArrowSvgContainer>
          <ArrowSvg />
        </ArrowSvgContainer>
        <BodyTextContainer>
          <IntroText>Your</IntroText>
          <IntroTextBold>Total Cash Value</IntroTextBold>
          <IntroText>is now called a</IntroText>
          <IntroTextBold>Portfolio Balance</IntroTextBold>
        </BodyTextContainer>
        <ButtonContainer>
          <IntroButton
            onPress={() => navigation.navigate('Intro', {screen: 'Wallet'})}
          />
        </ButtonContainer>
      </Body>
    </IntroBalanceContainer>
  );
};

export default IntroBalance;
