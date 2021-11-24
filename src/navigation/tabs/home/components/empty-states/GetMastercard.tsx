import React from 'react';
import HomeCard from '../../../../../components/home-card/HomeCard';
import MCLogo from '../../../../../../assets/img/logos/mc-logo.svg';
import styled from 'styled-components/native';
import BitPayBBackgroundImg from '../../../../../../assets/img/logos/bitpay-b-background.svg';

const HeaderImg = styled.View`
  width: 60px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const HeaderComponent = (
  <HeaderImg>
    <MCLogo />
  </HeaderImg>
);
const GetMastercard = () => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };
  return (
    <HomeCard
      backgroundImg={() => <BitPayBBackgroundImg />}
      header={HeaderComponent}
      body={{description: 'Get the BitPay prepaid Mastercard®'}}
      footer={{
        onCTAPress: _onCTAPress,
      }}
    />
  );
};

export default GetMastercard;
