import React from 'react';
import styled from 'styled-components/native';
import BitPayLogo from '../../../assets/img/logos/bitpay-white.svg';
import {BitPay} from '../../../styles/colors';

const SplashContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background: ${BitPay};
`;

// TODO animate me
const SplashScreen = () => {
  return (
    <SplashContainer>
      <BitPayLogo width={125} height={125} />
    </SplashContainer>
  );
};

export default SplashScreen;
