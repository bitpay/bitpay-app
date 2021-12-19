import {Image} from 'react-native';
import React from 'react';
import {OfferProps} from './OfferSlides';

export const OfferItems: OfferProps[] = [
  {
    id: 1,
    title: 'JOMASHOP',
    description: '20% off select products for BitPay customers.',
    img: (
      <Image source={require('../../../assets/img/home/offers/jomashop.png')} />
    ),
    onPress: () => {},
  },
  {
    id: 2,
    title: 'AIRBNB',
    description: '20% off select products for BitPay customers.',
    img: (
      <Image source={require('../../../assets/img/home/offers/airbnb.png')} />
    ),
    onPress: () => {},
  },
];
