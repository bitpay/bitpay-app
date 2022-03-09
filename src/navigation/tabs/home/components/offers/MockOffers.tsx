import {ClassicContentCard} from 'react-native-appboy-sdk';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockOffers: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '1',
    title: 'JOMASHOP',
    cardDescription: '[DEV] 20% off select products for BitPay customers.',
    image: require('../../../../../../assets/img/home/offers/jomashop.png'),
    url: '',
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '2',
    title: 'AIRBNB',
    cardDescription: '[DEV] 20% off select products for BitPay customers.',
    image: require('../../../../../../assets/img/home/offers/airbnb.png'),
    url: '',
    openURLInWebView: false,
  },
];

export default MockOffers;
