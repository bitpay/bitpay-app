import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';

const WalletSettings = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'WalletSettings'>>();

  return <BaseText>Wallet Settings {wallet.id}</BaseText>;
};

export default WalletSettings;
