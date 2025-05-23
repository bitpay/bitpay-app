import {ClassicContentCard} from '@braze/react-native-sdk';
import {DEFAULT_CLASSIC_CONTENT_CARD} from '../../../utils/braze';

const MockCardOffers: ClassicContentCard[] = [
  {
    ...DEFAULT_CLASSIC_CONTENT_CARD,
    id: 'dev_1',
    title: 'Card Offers',
    cardDescription: 'Earn cash back when you shop at top retailers.',
    image: require('../../../../assets/img/home/offers/amc.png'),
    openURLInWebView: false,
  },
];

export default MockCardOffers;
