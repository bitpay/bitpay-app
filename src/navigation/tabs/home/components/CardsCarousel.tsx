import React, {ReactNode, useRef} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import Carousel from 'react-native-snap-carousel';
import {WIDTH} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import CreateWallet from './empty-states/CreateWallet';
import styled from 'styled-components/native';

import HomeCard from '../../../../components/home-card/HomeCard';
import { CurrencyList } from '../../../../constants/CurrencySelectionListOptions';

const HeaderImg = styled.View`
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const CarouselContainer = styled.View`
  margin: 10px 0;
`;

const CurrencyCardComponet = (currency: string, price: string) => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };

  const currencyInfo = CurrencyList.find(
    ({id}: {id: string | number}) => id === currency,
  );

  const HeaderComponent = (
    <HeaderImg>{currencyInfo && currencyInfo.roundIcon()}</HeaderImg>
  );

  return (
    <>
      {currencyInfo && (
        <HomeCard
          header={HeaderComponent}
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
  const cardsList: Array<ReactNode | null> = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const ref = useRef(null);

  if (wallets && !Object.keys(wallets).length) {
    cardsList.push(() => <CreateWallet />);
  } else {
    Object.values(wallets).map((wallet: any) => {
      const {assets, totalBalance} = wallet;
      if (!assets.length) {
        cardsList.push(() => <CreateWallet />);
        return;
      }

      assets &&
        assets.map((asset: any) => {
          cardsList.push(() => CurrencyCardComponet(asset.coin, totalBalance));
        });

      cardsList.push(() => <CreateWallet />);
    });
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
