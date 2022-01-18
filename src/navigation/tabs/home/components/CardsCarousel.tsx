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
import BitPayCard from './empty-states/BitPayCard';
import ConnectCoinbase from './empty-states/ConnectCoinbase';
import WalletCardComponent from './Wallet';

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
};

const CardsCarousel = () => {
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const DEFAULTS = [
    <CreateWallet />,
    <BuyGiftCards />,
    <BitPayCard />,
    <ConnectCoinbase />,
  ];
  const [cardsList, setCardsList] = useState([...DEFAULTS]);
  const navigation = useNavigation();

  useEffect(() => {
    if (wallets) {
      const list = Object.values(wallets)
        .filter(wallet => wallet.show)
        .map(wallet => {
          const {assets, totalBalance = 0} = wallet;

          return WalletCardComponent({
            assets,
            totalBalance,
            onPress: () =>
              navigation.navigate('Wallet', {
                screen: 'WalletOverview',
                params: {wallet},
              }),
          });
        });
      setCardsList([...list, ...DEFAULTS]);
    }
  }, [wallets]);

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
