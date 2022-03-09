import {ClassicContentCard} from 'react-native-appboy-sdk';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockAdvertisements: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'buyCrypto',
    image: require('../../../../../../assets/img/advertisement/adv-buy.svg'),
    title: 'Buy Crypto',
    cardDescription: '[DEV] Exchange ERC-20 Tokens or cross chain assets',
    url: '',
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'swapCrypto',
    image: require('../../../../../../assets/img/advertisement/adv-swap.svg'),
    title: 'Swap Crypto',
    cardDescription: '[DEV] Buy direct using your debit or credit card',
    url: '',
    openURLInWebView: false,
  },
];

export default MockAdvertisements;
