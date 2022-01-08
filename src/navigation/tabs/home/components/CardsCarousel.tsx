import React, {ReactNode, useEffect, useState} from 'react';
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
import {BaseText} from '../../../../components/styled/Text';
import {Slate} from '../../../../styles/colors';

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

const RemainingAssetsLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  margin-left: 5px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
};

const ASSET_DISPLAY_LIMIT = 4;
const ICON_SIZE = 25;

const WalletCardComponent = (wallet: WalletObj) => {
  const navigation = useNavigation();
  const [remainingAssetCount, setremainingAssetCount] = useState<null | number>(
    null,
  );
  const {assets, totalBalance} = wallet;

  useEffect(() => {
    if (assets.length > 4) {
      setremainingAssetCount(assets.length - 4);
    }
  }, [assets]);

  const currencyInfo = assets
    .slice(0, ASSET_DISPLAY_LIMIT)
    .map(asset => asset.coin)
    .map(currency =>
      AssetSelectionOptions.find(
        ({id}: {id: string | number}) => id === currency,
      ),
    );

  const HeaderComponent = (
    <HeaderImg>
      {currencyInfo &&
        currencyInfo.map(
          (currency, index) =>
            currency && (
              <Img
                key={index}
                isFirst={index === 0 || index % 11 === 0}
                size={ICON_SIZE + 'px'}>
                {currency.roundIcon(ICON_SIZE)}
              </Img>
            ),
        )}
      {remainingAssetCount && (
        <RemainingAssetsLabel>
          + {remainingAssetCount} more
        </RemainingAssetsLabel>
      )}
    </HeaderImg>
  );

  return (
    <HomeCard
      header={HeaderComponent}
      body={{title: 'My Everything Wallet', value: `$${totalBalance}`}}
      onCTAPress={() => {
        navigation.navigate('Wallet', {
          screen: 'WalletOverview',
          params: {wallet},
        });
      }}
    />
  );
};

const CardsCarousel = () => {
  const cardsList: ReactNode[] = [];
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);

  if (wallets) {
    Object.values(wallets).forEach((wallet: WalletObj) => {
      if (wallet.show) {
        cardsList.push(WalletCardComponent(wallet));
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
