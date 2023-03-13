import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {FlatList, View} from 'react-native';
import KeySvg from '../../../../assets/img/key.svg';
import {SlateDark, White} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import WCV2WalletRow from './WCV2WalletRow';
import {Hr} from '../../../components/styled/Containers';
import {
  WCV2Key,
  WCV2Wallet,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {NoGutter} from '../styled/WalletConnectContainers';

interface KeyWalletsRowContainerProps {
  isLast?: boolean;
}

const KeyWalletsRowContainer = styled.View<KeyWalletsRowContainerProps>`
  justify-content: flex-start;
  display: flex;
  margin: 0 12px;
`;

interface KeyNameContainerProps {
  noBorder?: boolean;
}

const KeyNameContainer = styled.View<KeyNameContainerProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 7px;
  font-size: 14px;
  font-weight: 700;
`;

const KeyContainer = styled.View`
  flex-direction: row;
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 16px 0 16px 4px;
`;

interface WCV2KeyWalletProps {
  keys: WCV2Key[];
  onPress: (keyId: string, wallet: WCV2Wallet) => void;
  topic?: string;
  peerId?: string;
}

export const WCV2KeyWalletsRow = ({
  keys,
  onPress,
  topic,
}: WCV2KeyWalletProps) => {
  const renderItem = useCallback(
    ({item, keyId, isLast}) => {
      return item ? (
        <NoGutter key={item.id}>
          <WCV2WalletRow
            walletObj={item}
            keyId={keyId}
            isLast={isLast}
            onPress={onPress}
            showCheckbox={true}
            topic={topic}
          />
        </NoGutter>
      ) : null;
    },
    [onPress],
  );

  const renderKey = useCallback(
    ({item, isLast}) => {
      const {wallets, keyName, keyId} = item;

      return wallets.length ? (
        <KeyWalletsRowContainer key={keyId} isLast={isLast}>
          <>
            <Hr style={{marginHorizontal: -12}} />
            <KeyContainer>
              <KeyNameContainer>
                <KeySvg />
                <KeyName>{keyName || 'My Key'}</KeyName>
              </KeyNameContainer>
              <View style={{justifyContent: 'flex-end', display: 'flex'}} />
            </KeyContainer>
            <View style={{marginTop: -15}}>
              <FlatList
                contentContainerStyle={{paddingBottom: 20}}
                data={wallets}
                keyExtractor={(_item, index) => index.toString()}
                renderItem={({
                  item,
                  index,
                }: {
                  item: WCV2Wallet;
                  index: number;
                }) => {
                  const isLast = index === wallets.length - 1;
                  return renderItem({item, keyId, isLast});
                }}
              />
            </View>
          </>
        </KeyWalletsRowContainer>
      ) : null;
    },
    [keys],
  );

  return (
    <View style={{marginBottom: 210}}>
      {keys ? (
        <FlatList
          data={keys}
          keyExtractor={(_item, index) => index.toString()}
          renderItem={({item, index}: {item: WCV2Key; index: number}) => {
            const isLast = index === keys.length - 1;
            return renderKey({item, isLast});
          }}
        />
      ) : null}
    </View>
  );
};

export default WCV2KeyWalletsRow;
