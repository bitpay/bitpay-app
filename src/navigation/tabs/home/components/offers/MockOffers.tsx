import {ClassicContentCard} from 'react-native-appboy-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockOffers: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '1',
    title: 'JOMASHOP',
    cardDescription: '20% off select products for BitPay customers.',
    image: require('../../../../../../assets/img/home/offers/jomashop.png'),
    url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=jomashop`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '2',
    title: 'AIRBNB',
    cardDescription: '20% off select products for BitPay customers.',
    image: require('../../../../../../assets/img/home/offers/airbnb.png'),
    url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=airbnb`,
    openURLInWebView: false,
  },
];

export default MockOffers;
