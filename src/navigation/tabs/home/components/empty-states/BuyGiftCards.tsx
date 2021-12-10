import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';

const BuyGiftCards = () => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };
  return (
    <HomeCard
      body={{description: 'Buy gift cards from major retailers'}}
      footer={{
        onCTAPress: _onCTAPress,
      }}
    />
  );
};

export default BuyGiftCards;
