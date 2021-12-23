import {useNavigation, useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Link, Paragraph} from '../../../components/styled/Text';

export const WalletConnectContainer = styled.View`
  flex: 1;
  padding: 0 16px;
`;

export const ScrollView = styled.ScrollView`
  margin-top: 20px;
`;

const TextContainer = styled(Paragraph)<{isDark: boolean}>`
  padding-bottom: 57px;
`;

const WalletConnectIntro = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  return (
    <WalletConnectContainer>
      <ScrollView>
        <TextContainer style={textStyle}>
          WalletConnect is an open source protocol for connecting decentralized
          applications to mobile wallets with QR code scanning or deep linking.{' '}
          <Link isDark={theme.dark}>Learn more</Link>
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
