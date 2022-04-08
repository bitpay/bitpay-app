import React from 'react';
import LinkCard from './LinkCard';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
const ConnectCoinbase = () => {
  return (
    <LinkCard
      image={() => <CoinbaseSmall />}
      description={'Connect your Coinbase account'}
      onPress={() => null}
    />
  );
};

export default ConnectCoinbase;
