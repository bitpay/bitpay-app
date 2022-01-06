import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import Carousel from 'react-native-snap-carousel';
import {WIDTH} from '../../../../components/styled/Containers';
import haptic from '../../../../components/haptic-feedback/haptic';
import CreateWallet from './empty-states/CreateWallet';
import styled from 'styled-components/native';

import HomeCard from '../../../../components/home-card/HomeCard';
import {AssetSelectionOptions} from '../../../../constants/AssetSelectionOptions';
import {useNavigation} from '@react-navigation/native';
import {WalletObj} from '../../../../store/wallet/wallet.models';
import {Network} from '../../../../constants';

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const Img = styled.View<{isFirst: boolean; size: string}>`
  width: ${({size}) => size};
  height: ${({size}) => size};
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
`;

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
};

interface CurrencyCardProps {
  wallet: WalletObj;
  network: Network;
}

const CurrencyCardComponent = ({wallet, network}: CurrencyCardProps) => {
  const navigation = useNavigation();

  const {assets, totalBalance} = wallet;
  const currencyInfo = assets
    .map(asset => asset.coin)
    .map(currency =>
      AssetSelectionOptions.find(
        ({id}: {id: string | number}) => id === currency,
      ),
    );

  const iconSize = currencyInfo.length > 7 ? 20 : 30;

  const HeaderComponent = (
    <HeaderImg>
      {currencyInfo &&
        currencyInfo.map(
          (currency, index) =>
            currency && (
              <Img
                key={index}
                isFirst={index === 0 || index % 11 === 0}
                size={iconSize + 'px'}>
                {currency.roundIcon(iconSize)}
              </Img>
            ),
        )}
    </HeaderImg>
  );

  return (
    <HomeCard
      header={HeaderComponent}
      body={{title: 'My Everything Wallet', value: `$${totalBalance}`}}
      footer={{
        onCTAPress: () => {
          navigation.navigate('Wallet', {
            screen: 'WalletOverview',
            params: {wallet},
          });
        },
      }}
    />
  );
};

const CardsCarousel = () => {
  const cardsList: ReactNode[] = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const network = useSelector(({APP}: RootState) => APP.network);

  if (wallets) {
    Object.values(wallets).forEach((wallet: WalletObj) => {
      if (wallet.show) {
        cardsList.push(CurrencyCardComponent({wallet, network}));
      }
    });

    cardsList.push(<CreateWallet />);
  }

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
