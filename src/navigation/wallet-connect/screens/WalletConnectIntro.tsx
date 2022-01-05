import {useNavigation} from '@react-navigation/native';
import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Link, Paragraph} from '../../../components/styled/Text';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';

const TextContainer = styled.View`
  padding-bottom: 57px;
`;

const WalletConnectIntro = () => {
  const navigation = useNavigation();
  return (
    <WalletConnectContainer>
      <ScrollView>
        <TextContainer>
          <Paragraph>
            WalletConnect is an open source protocol for connecting
            decentralized applications to mobile wallets with QR code scanning
            or deep linking. <Link>Learn more</Link>
          </Paragraph>
        </TextContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => {
            navigation.navigate('WalletConnect', {
              screen: 'WalletConnectStart',
            });
          }}>
          Connect
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectIntro;
