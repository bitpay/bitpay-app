import React from 'react';
import styled from 'styled-components/native';
import CardsCarousel from './components/CardsCarousel';
import PortfolioBalance from './components/PortfolioBalance';

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
      </ScrollView>
    </HomeContainer>
  );
};

export default HomeStack;
