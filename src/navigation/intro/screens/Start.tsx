import React from 'react';
import styled from 'styled-components/native';
import FeatureCard from '../../../components/feature-card/FeatureCard';
import {useNavigation, useTheme} from '@react-navigation/native';
const lightImage = require('../../../../assets/img/intro/light/whats-new.png');
const darkImage = require('../../../../assets/img/intro/dark/whats-new.png');
const IntroStartContainer = styled.View`
  flex: 1;
`;

const Start = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  return (
    <IntroStartContainer>
      <FeatureCard
        image={theme.dark ? darkImage : lightImage}
        descriptionTitle={'Explore the new BitPay App'}
        descriptionText={
          'Your home tab is now your launchpad. View all your keys and check out new offerings from BitPay.'
        }
        ctaText={'Check it out'}
        cta={() => navigation.navigate('Intro', {screen: 'Wallet'})}
      />
    </IntroStartContainer>
  );
};

export default Start;
