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
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const Img = styled.View<{isFirst: boolean}>`
  width: 30px;
  height: 30px;
  margin-left: ${({isFirst}: {isFirst: boolean}) => (isFirst ? 0 : '-5px')};
`;

const CarouselContainer = styled.View`
  margin: 10px 0;
`;

const CurrencyCardComponent = (
  currencyList: string[],
  totalBalance: string,
) => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };

  const currencyInfo = currencyList.map(currency =>
    CurrencyList.find(({id}: {id: string | number}) => id === currency),
  );

  const HeaderComponent = (
    <HeaderImg>
      {currencyInfo &&
        currencyInfo.map(
          (currency, index) =>
            currency && <Img isFirst={index === 0 || (index % 7 === 0)}>{currency.roundIcon}</Img>,
        )}
    </HeaderImg>
  );

  return (
    <HomeCard
      header={HeaderComponent}
      // TODO: update the price code
      body={{header: 'My Everything Wallet', price: `$${totalBalance}`}}
      footer={{
        onCTAPress: _onCTAPress,
      }}
    />
  );
};

const CardsCarousel = () => {
  const cardsList: ReactNode[] = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);

  if (wallets) {
    if (Object.keys(wallets).length) {
      Object.values(wallets).forEach((wallet: any) => {
        const {assets, totalBalance, show} = wallet;
        if (show && assets) {
          const currencyList: string[] = [];
          assets.forEach(
            (assets: any) =>
              assets.network === 'livenet' && currencyList.push(assets.coin),
          );
          if (currencyList.length) {
            cardsList.push(CurrencyCardComponent(currencyList, totalBalance));
          }
        }
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
