import React, {memo, ReactElement} from 'react';
import styled from 'styled-components/native';
import {View} from 'react-native';
import {BaseText} from '../styled/Text';
import KeySvg from '../../../assets/img/key.svg';
import {LightBlack, SlateDark, White} from '../../styles/colors';
import {Wallet} from '../../store/wallet/wallet.models';
import {WalletRowProps} from './WalletRow';
import WalletRow from './WalletRow';

const RowContainer = styled.View`
  margin-bottom: 20px;
`;

const KeyNameContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-bottom: 10px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: 1px;
  margin-bottom: 10px;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 10px;
`;

const NoGutter = styled(View)`
  margin: 0 -10px;
`;

export interface KeyWallet extends Wallet, WalletRowProps {
  img: string | ((props: any) => ReactElement);
}

export interface KeyWalletsRowProps {
  key: string;
  keyName: string;
  wallets: KeyWallet[];
}

interface KeyWalletProps {
  keyWallets: KeyWalletsRowProps[];
  onPress: (wallet: KeyWallet) => void;
}

const KeyWalletsRow = ({keyWallets, onPress}: KeyWalletProps) => {
  return (
    <View>
      {keyWallets.map(key => (
        <RowContainer key={key.key}>
          <KeyNameContainer>
            <KeySvg />
            <KeyName>{key.keyName || 'My Key'}</KeyName>
          </KeyNameContainer>

          {key.wallets.map(w => (
            <NoGutter key={w.id}>
              <WalletRow
                wallet={w}
                id={w.id}
                onPress={() => {
                  onPress(w);
                }}
              />
            </NoGutter>
          ))}
        </RowContainer>
      ))}
    </View>
  );
};

export default memo(KeyWalletsRow);
