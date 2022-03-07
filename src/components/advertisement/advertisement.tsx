import React from 'react';
import {AdvertisementProps} from './AdvertisementCard';
import AdvBuyImg from '../../../assets/img/advertisement/adv-buy.svg';
import {navigationRef} from '../../Root';
import AdvSwapImg from '../../../assets/img/advertisement/adv-swap.svg';

export const AdvertisementList: AdvertisementProps[] = [
  {
    id: 'buyCrypto',
    title: 'Buy Crypto',
    text: 'Buy direct using your debit or credit card',
    img: <AdvBuyImg />,
    onPress: () => {
      navigationRef.navigate('Wallet', {
        screen: 'Amount',
        params: {
          nextView: 'buyCrypto',
        },
      });
    },
  },
  {
    id: 'swapCrypto',
    title: 'Swap Crypto',
    text: 'Exchange ERC-20 Tokens or cross chain assets',
    img: <AdvSwapImg />,
    onPress: () => {
      navigationRef.navigate('SwapCrypto', {screen: 'Root'});
    },
  },
];
