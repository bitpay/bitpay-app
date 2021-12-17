import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Link, Paragraph} from '../../../components/styled/Text';

export const WalletConnectRootContainer = styled.View`
  flex: 1;
`;

export const ScrollView = styled.ScrollView`
  padding: 0 16px;
  margin-top: 20px;
`;

const WalletConnectRoot = () => {
  return (
    <WalletConnectRootContainer>
      <ScrollView>
        <Paragraph style={{paddingBottom: 57}}>
          WalletConnect is an open source protocol for connecting decentralized
          applications to mobile wallets with QR code scanning or deep linking.{' '}
          <Link>Learn more</Link>
        </Paragraph>
        <Button buttonStyle={'primary'}>Connect</Button>
      </ScrollView>
    </WalletConnectRootContainer>
  );
};

export default WalletConnectRoot;
