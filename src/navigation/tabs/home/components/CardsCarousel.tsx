import React, {ReactNode, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import Carousel from 'react-native-snap-carousel';
import {WIDTH} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import CreateWallet from './empty-states/CreateWallet';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import BuyGiftCards from './empty-states/BuyGiftCards';
import GetMastercard from './empty-states/GetMastercard';
import ConnectCoinbase from './empty-states/ConnectCoinbase';
import WalletCardComponent from './Wallet';

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
};

const CardsCarousel = () => {
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const DEFAULTS = [
    <CreateWallet />,
    <BuyGiftCards />,
    <GetMastercard />,
    <ConnectCoinbase />,
  ];
  const [cardsList, setCardsList] = useState([...DEFAULTS]);
  const navigation = useNavigation();

  useEffect(() => {
    if (keys) {
      const list = Object.values(keys)
        .filter(key => key.show)
        .map(key => {
          const {wallets, totalBalance = 0} = key;

          return WalletCardComponent({
            wallets,
            totalBalance,
            onPress: () =>
              navigation.navigate('Wallet', {
                screen: 'KeyOverview',
                params: {key},
              }),
          });
        });
      setCardsList([...list, ...DEFAULTS]);
    }
  }, [keys]);

  return (
    <CarouselContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={cardsList}
        renderItem={_renderItem}
        sliderWidth={WIDTH}
        itemWidth={235}
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
