import styled from 'styled-components/native';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import React from 'react';
import {BaseText, Link, TextAlign} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 10px;
`;

const Action = styled(Link)``;

const Title = styled(BaseText)``;

const HeaderContainer = styled.View<{justifyContent: string}>`
  flex-direction: row;
  margin-top: 10px;
  justify-content: ${({justifyContent}: {justifyContent: string}) =>
    justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const goToCustomize = () => {};

  return (
    <HomeContainer>
      <Home>
        <PortfolioBalance />

        <HeaderContainer justifyContent={'flex-end'}>
          <Button buttonType={'link'} onPress={goToCustomize}>
            <Link>Customize</Link>
          </Button>
        </HeaderContainer>
        <TextAlign align={'right'}>here</TextAlign>
        <CardsCarousel />
        <LinkingButtons />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
