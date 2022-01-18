import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';
import CoinbaseSvg from '../../../../../../assets/img/logos/coinbase.svg';
import styled from 'styled-components/native';

const HeaderImg = styled.View`
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const HeaderComponent = (
  <HeaderImg>
    <CoinbaseSvg />
  </HeaderImg>
);

const ConnectCoinbase = () => {
  const onCTAPress = () => {
    /** TODO: Redirect me */
  };

  return (
    <HomeCard
      header={HeaderComponent}
      body={{description: 'Connect your Coinbase account'}}
      onCTAPress={onCTAPress}
    />
  );
};

export default ConnectCoinbase;
