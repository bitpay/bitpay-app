import {ImageSourcePropType} from 'react-native';

export interface OfferProps {
  id: number;
  img: ImageSourcePropType;
  title?: string;
  description?: string;
  onPress: () => void;
}

export const OfferItems: OfferProps[] = [
  {
    id: 1,
    title: 'JOMASHOP',
    description: '20% off select products for BitPay customers.',
    img: require('../../../assets/img/home/offers/jomashop.png'),
    onPress: () => {},
  },
  {
    id: 2,
    title: 'AIRBNB',
    description: '20% off select products for BitPay customers.',
    img: require('../../../assets/img/home/offers/airbnb.png'),
    onPress: () => {},
  },
];
