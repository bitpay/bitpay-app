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

interface KeyWalletsRowContainerProps {
  isLast?: boolean;
}

const KeyWalletsRowContainer = styled.View<KeyWalletsRowContainerProps>`
  margin-bottom: 0px;
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: 0;
`;

interface KeyNameContainerProps {
  noBorder?: boolean;
}

const KeyNameContainer = styled.View<KeyNameContainerProps>`
  flex-direction: row;
  align-items: center;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: ${({noBorder}) => (noBorder ? 0 : 1)}px;
  margin-top: 20px;
  ${({noBorder}) => (noBorder ? 'margin-left: 10px;' : '')}
  padding-bottom: ${({noBorder}) => (noBorder ? 0 : 10)}px;
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
  currency?: string;
  hideBalance: boolean;
}

const KeyWalletsRow = <T extends WalletRowType>({
  keyWallets,
  keySvg = KeySvg,
  onPress,
  currency,
  hideBalance,
}: KeyWalletProps<T>) => {
  return (
    <View>
      {keyWallets.map((key, keyIndex) => (
        <KeyWalletsRowContainer
          key={key.key}
          isLast={keyIndex === keyWallets.length - 1}>
          {key.wallets.length >= 1 ? (
            <KeyNameContainer noBorder={!!currency}>
              {keySvg({})}
              <KeyName>{key.keyName || 'My Key'}</KeyName>
            </KeyNameContainer>
          ) : null}

          {key.wallets.map((w, walletIndex) => (
            <NoGutter key={w.id}>
              <WalletRow
                wallet={w}
                id={w.id}
                hideIcon={!!currency}
                hideBalance={hideBalance}
                isLast={
                  walletIndex === key.wallets.length - 1 &&
                  keyIndex === keyWallets.length - 1
                }
                onPress={() => {
                  onPress(w);
                }}
              />
            </NoGutter>
          ))}
        </KeyWalletsRowContainer>
      ))}
    </View>
  );
};

export default KeyWalletsRow;
