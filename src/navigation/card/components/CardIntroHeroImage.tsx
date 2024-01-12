import React from 'react';
import FastImage from 'react-native-fast-image';

const HeroImage = () => {
  return (
    <FastImage
      style={{
        width: 204,
        height: 310,
      }}
      source={require('../../../../assets/img/card/bitpay-card-phone.png')}
    />
  );
};

export default HeroImage;
