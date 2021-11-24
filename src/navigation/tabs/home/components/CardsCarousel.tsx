import React, {ReactNode, useRef} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import BuyGiftCards from './empty-states/BuyGiftCards';
import Carousel from 'react-native-snap-carousel';
import {WIDTH} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import CreateWallet from './empty-states/CreateWallet';
import GetMastercard from './empty-states/GetMastercard';
import ConnectCoinbase from './empty-states/ConnectCoinbase';
import styled from 'styled-components/native';

const CarouselContainer = styled.View`
  margin: 10px 0;
`;

const CardsCarousel = () => {
  const cardsList = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const ref = useRef(null);

  // Empty State
  if (wallets && !Object.keys(wallets).length) {
    cardsList.push(() => <CreateWallet />);
    cardsList.push(() => <GetMastercard />);
    cardsList.push(() => <ConnectCoinbase />);
    cardsList.push(() => <BuyGiftCards />);
  }

  const _renderItem = ({item}: {item: ReactNode}) => {
    return <>{item()}</>;
  };

  return (
    <CarouselContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={cardsList}
        renderItem={_renderItem}
        ref={ref}
        sliderWidth={WIDTH}
        itemWidth={225}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
        onScrollIndexChanged={() => {
          haptic('impactLight');
        }}
      />
    </CarouselContainer>
  );
};

export default CardsCarousel;
