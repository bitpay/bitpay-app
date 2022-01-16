import React from 'react';
import styled from 'styled-components/native';
import FeatureCard from '../../../components/feature-card/FeatureCard';
import {useNavigation} from '@react-navigation/native';

const IntroStartContainer = styled.View`
  flex: 1;
`;

const Start = () => {
  const navigation = useNavigation();

  return (
    <IntroStartContainer>
      <FeatureCard
        headerTitle={'New Everything'}
        image={require('../../../../assets/img/intro/light/whats-new.png')}
        descriptionTitle={'Explore the new BitPay App'}
        descriptionText={
          'Your home tab is now your launchpad. View all your assets and check out new offerings from BitPay.'
        }
        ctaText={'Check it out'}
        cta={() => navigation.navigate('Intro', {screen: 'Balance'})}
      />
    </IntroStartContainer>
  );
};

export default Start;
