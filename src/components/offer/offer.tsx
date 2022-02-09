import React from 'react';
import {Image, ImageProps} from 'react-native';
import {OfferProps} from './OfferSlides';

export const OFFER_HEIGHT = 182;
export const OFFER_WIDTH = 260;

const OfferImage: React.FC<Omit<ImageProps, 'height' | 'width'>> = props => {
  return (
    <Image
      style={{
        height: OFFER_HEIGHT,
        width: OFFER_WIDTH,
      }}
      height={OFFER_HEIGHT}
      width={OFFER_WIDTH}
      {...props}
    />
  );
};

export const OfferItems: OfferProps[] = [
  {
    id: 1,
    title: 'JOMASHOP',
    description: '20% off select products for BitPay customers.',
    img: (
      <OfferImage
        source={require('../../../assets/img/home/offers/jomashop.png')}
      />
    ),
    onPress: () => {},
  },
  {
    id: 2,
    title: 'AIRBNB',
    description: '20% off select products for BitPay customers.',
    img: (
      <OfferImage
        source={require('../../../assets/img/home/offers/airbnb.png')}
      />
    ),
    onPress: () => {},
  },
];
