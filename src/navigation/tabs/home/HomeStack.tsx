import React from 'react';
import styled from 'styled-components/native';
import CardsCarousel from './components/CardsCarousel';
import PortfolioBalance from './components/PortfolioBalance';
import LinkingButtons from './components/LinkingButtons';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  padding: 10px;
`;

const HomeStack = () => {
  return (
    <HomeContainer>
      <ScrollView>
        <PortfolioBalance />
        <CardsCarousel />
        <LinkingButtons/>
      </ScrollView>
    </HomeContainer>
  );
};

export default HomeStack;
