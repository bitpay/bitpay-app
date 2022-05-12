import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {View} from 'react-native';
import {BaseText} from '../styled/Text';
import KeySvg from '../../../assets/img/key.svg';
import {LightBlack, SlateDark, White} from '../../styles/colors';
import {Wallet} from '../../store/wallet/wallet.models';
import {WalletRowProps} from './WalletRow';
import WalletRow from './WalletRow';
import {SvgProps} from 'react-native-svg';

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
  padding-right: 5px;
`;

type WalletRowType = KeyWallet | WalletRowProps;

export interface KeyWallet extends Wallet, WalletRowProps {
  img: string | ((props: any) => ReactElement);
}

export interface KeyWalletsRowProps<T> {
  key: string;
  keyName: string;
  wallets: T[];
}

interface KeyWalletProps<T extends WalletRowType> {
  keyWallets: KeyWalletsRowProps<T>[];
  keySvg?: React.FC<SvgProps>;
  onPress: (wallet: T) => void;
}

const KeyWalletsRow = <T extends WalletRowType>({
  keyWallets,
  keySvg = KeySvg,
  onPress,
}: KeyWalletProps<T>) => {
  return (
    <View>
      {keyWallets.map(key => (
        <RowContainer key={key.key}>
          <KeyNameContainer>
            {keySvg({})}
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

export default KeyWalletsRow;
