import {ClassicContentCard} from 'react-native-appboy-sdk';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../../../utils/braze';

const MockOffers: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '1',
    cardDescription: 'Buy movie tickets at AMC Theaters',
    image: require('../../../../../../assets/img/home/offers/amc.png'),
    url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amc`,
    openURLInWebView: false,
  },
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: '2',
    cardDescription: 'Spend Crypto at Amazon',
    image: require('../../../../../../assets/img/home/offers/amazon.png'),
    url: `${APP_DEEPLINK_PREFIX}giftcard?merchant=amazon`,
    openURLInWebView: false,
  },
];

export default MockOffers;
