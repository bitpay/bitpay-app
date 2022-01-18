import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';

const BuyGiftCards = () => {
  const onCTAPress = () => {
    /** TODO: Redirect me */
  };

  return (
    <HomeCard
      body={{description: 'Buy gift cards from major retailers'}}
      onCTAPress={onCTAPress}
    />
  );
};

export default BuyGiftCards;
