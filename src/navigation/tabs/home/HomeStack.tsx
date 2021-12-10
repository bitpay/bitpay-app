import React from 'react';
import {ScrollView} from 'react-native';
import styled from 'styled-components/native';
import CardsCarousel from './components/CardsCarousel';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const HomeStack = () => {
  return (
    <HomeContainer>
      <ScrollView>
        <CardsCarousel />
      </ScrollView>
    </HomeContainer>
  );
};

export default HomeStack;
