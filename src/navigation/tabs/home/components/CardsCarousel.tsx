import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import Carousel from 'react-native-snap-carousel';
import {WIDTH} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import CreateWallet from './empty-states/CreateWallet';
import styled from 'styled-components/native';

import HomeCard from '../../../../components/home-card/HomeCard';
import {CurrencyList} from '../../../../constants/CurrencySelectionListOptions';

const HeaderImg = styled.View`
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const CarouselContainer = styled.View`
  margin: 10px 0;
`;

const CurrencyCardComponent = (currency: string, price: string) => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };

  const currencyInfo = CurrencyList.find(
    ({id}: {id: string | number}) => id === currency,
  );

  const HeaderComponent = (
    <HeaderImg>{currencyInfo && currencyInfo.roundIcon}</HeaderImg>
  );

  return (
    <>
      {currencyInfo && (
        <HomeCard
          header={HeaderComponent}
          // TODO: update the price code
          body={{header: currencyInfo.mainLabel, price: `${price}$`}}
          footer={{
            onCTAPress: _onCTAPress,
          }}
        />
      )}
    </>
  );
};

const CardsCarousel = () => {
  const cardsList: ReactNode[] = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);

  if (wallets) {
    if (Object.keys(wallets).length) {
      Object.values(wallets).forEach((wallet: any) => {
        const {assets, totalBalance} = wallet;
        assets &&
          assets.map((asset: any) => {
            cardsList.push(CurrencyCardComponent(asset.coin, totalBalance));
          });
      });
    }

    cardsList.push(<CreateWallet />);
  }
  const _renderItem = ({item}: {item: ReactNode}) => {
    return <>{item}</>;
  };

  return (
    <CarouselContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={cardsList}
        renderItem={_renderItem}
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
