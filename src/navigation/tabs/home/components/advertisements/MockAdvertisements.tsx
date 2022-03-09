import {Advertisement} from './AdvertisementCard';

const MockAdvertisements: Advertisement[] = [
  {
    id: 'buyCrypto',
    img: require('../../../../../../assets/img/advertisement/adv-buy.svg'),
    title: 'Buy Crypto',
    description: '[Dev] Exchange ERC-20 Tokens or cross chain assets',
    url: '',
    openURLInWebView: false,
  },
  {
    id: 'swapCrypto',
    img: require('../../../../../../assets/img/advertisement/adv-swap.svg'),
    title: 'Swap Crypto',
    description: '[Dev] Buy direct using your debit or credit card',
    url: '',
    openURLInWebView: false,
  },
];

export default MockAdvertisements;
