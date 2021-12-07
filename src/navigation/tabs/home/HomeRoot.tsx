import styled from 'styled-components/native';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import React from 'react';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const HomeRoot = () => {
  return (
    <HomeContainer>
      <Home>
        <PortfolioBalance />
        <CardsCarousel />
        <LinkingButtons />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
