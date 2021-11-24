import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';

const CreateWalletCard = () => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };
  return (
    <HomeCard
      body={{description: 'Create, import or join a shared wallet'}}
      footer={{
        onCTAPress: _onCTAPress,
      }}
    />
  );
};

export default CreateWalletCard;
