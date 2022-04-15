import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import LinkCard from './LinkCard';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
const ConnectCoinbase = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const goToCoinbase = () => {
    navigation.navigate('Coinbase', {screen: 'CoinbaseRoot'});
  };
  return (
    <LinkCard
      image={() => <CoinbaseSmall />}
      description={t('Connect your Coinbase account')}
      onPress={goToCoinbase}
    />
  );
};

export default ConnectCoinbase;
