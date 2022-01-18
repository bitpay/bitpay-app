import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import Carousel from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../../../../components/haptic-feedback/haptic';
import {WIDTH} from '../../../../components/styled/Containers';
import {RootState} from '../../../../store';
import {Card} from '../../../../store/card/card.models';
import {WalletObj} from '../../../../store/wallet/wallet.models';
import {BitPayCard, GetMastercard} from './cards/BitPayCard';
import BuyGiftCards from './cards/BuyGiftCards';
import ConnectCoinbase from './cards/ConnectCoinbase';
import CreateWallet from './cards/CreateWallet';
import WalletCardComponent from './Wallet';

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
};

const createHomeCardList = (
  navigation: NavigationProp<any>,
  wallets: WalletObj[],
  cards: Card[],
) => {
  cards = cards.filter((c) => c.provider === 'galileo');

  const list: JSX.Element[] = [];
  const hasWallets = wallets.length;
  const hasCards = cards.length;
  const hasGiftCards = false;
  const hasCoinbase = false;

  if (hasWallets) {
    const walletCards = wallets
      .filter(wallet => wallet.show)
      .map(wallet => {
        const {assets, totalBalance = 0} = wallet;

        return (
          <WalletCardComponent
            assets={assets}
            totalBalance={totalBalance}
            onPress={() =>
              navigation.navigate('Wallet', {
                screen: 'WalletOverview',
                params: {wallet},
              })
            }
          />
        );
      });

    list.push(...walletCards);
  } else {
    list.push(<CreateWallet />);
  }

  if (hasCards) {
    list.push(<BitPayCard />);
  } else {
    list.push(<GetMastercard />);
  }

  if (hasCoinbase) {
    // TODO
  } else {
    list.push(<ConnectCoinbase />);
  }

  if (hasGiftCards) {
    // TODO
  } else {
    list.push(<BuyGiftCards />);
  }

  // if hasGiftCards, still show BuyGiftCards at the end before CreateWallet
  if (hasGiftCards) {
    list.push(<BuyGiftCards />);
  }

  // if hasWallets, still show CreateWallet at the end
  if (hasWallets) {
    list.push(<CreateWallet />);
  }

  return list;
};

const CardsCarousel = () => {
  const navigation = useNavigation();
  const bitPayCards = useSelector<RootState, Card[]>(({APP, CARD}) =>
    CARD.cards[APP.network],
  );
  const wallets = useSelector<RootState, {[k: string]: WalletObj}>(
    ({WALLET}) => WALLET.wallets,
  );
  const [cardsList, setCardsList] = useState(
    createHomeCardList(navigation, Object.values(wallets), bitPayCards),
  );

  useEffect(() => {
    setCardsList(
      createHomeCardList(navigation, Object.values(wallets), bitPayCards),
    );
  }, [navigation, wallets, bitPayCards]);

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
