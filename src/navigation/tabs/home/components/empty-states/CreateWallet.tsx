import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';
import {useNavigation} from '@react-navigation/native';

const CreateWallet = () => {
  const navigation = useNavigation();

  return (
    <HomeCard
      body={{description: 'Create, import or join a shared wallet'}}
      footer={{
        onCTAPress: () =>
          navigation.navigate('Wallet', {screen: 'SelectWalletType'}),
      }}
    />
  );
};

export default CreateWallet;
