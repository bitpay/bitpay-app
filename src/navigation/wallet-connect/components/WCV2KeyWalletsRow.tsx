import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {FlatList, View} from 'react-native';
import KeySvg from '../../../../assets/img/key.svg';
import {SlateDark, White} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import WCV2WalletRow from './WCV2WalletRow';
import {Hr, Row} from '../../../components/styled/Containers';
import {
  WCV2Key,
  WCV2Wallet,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {NoGutter} from '../styled/WalletConnectContainers';
import {SendToPillContainer} from '../../../navigation/wallet/screens/send/confirm/Shared';
import {
  PillContainer,
  PillText,
} from '../../../navigation/wallet/components/SendToPill';
import {formatCryptoAddress} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import Checkbox from '../../../components/checkbox/Checkbox';

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

const AddressRow = styled(Row)`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 10px;
`;
interface WCV2KeyWalletProps {
  keys: WCV2Key[];
  onPress: (keyId: string, wallet: WCV2Wallet) => void;
  topic?: string;
}

export const WCV2KeyWalletsRow = ({
  keys,
  onPress,
  topic,
}: WCV2KeyWalletProps) => {
  const AddressBox = ({
    keyId,
    nestedWallets,
    onPress,
  }: {
    keyId: string;
    nestedWallets: WCV2Wallet[];
    onPress: (keyId: string, wallet: WCV2Wallet) => void;
  }) => {
    return (
      <Checkbox
        checked={nestedWallets[0].checked!}
        onPress={() => {
          haptic('impactLight');
          onPress(keyId, nestedWallets[0]);
        }}
      />
    );
  };

  const renderItem = useCallback(
    ({
      item,
      keyId,
      isLast,
      showCheckbox,
      showAddress,
    }: {
      item: WCV2Wallet;
      keyId: string;
      isLast: boolean;
      showCheckbox: boolean;
      showAddress: boolean;
    }) => {
      return item ? (
        <NoGutter key={item.wallet.id}>
          <WCV2WalletRow
            walletObj={item}
            keyId={keyId}
            isLast={isLast}
            onPress={onPress}
            showCheckbox={showCheckbox}
            showAddress={showAddress}
            topic={topic}
            touchable={showCheckbox}
          />
        </NoGutter>
      ) : null;
    },
    [onPress],
  );

  const renderNestedWallets = useCallback(
    ({
      nestedWallets,
      keyId,
      isLast,
      showCheckbox,
    }: {
      nestedWallets: WCV2Wallet[];
      keyId: string;
      isLast: boolean;
      showCheckbox: boolean;
    }) => {
      return nestedWallets ? (
        <>
          <Hr style={{marginHorizontal: -12}} />
          {nestedWallets && nestedWallets[0]?.wallet ? (
            <>
              <AddressRow>
                <AddressBox
                  keyId={keyId}
                  nestedWallets={nestedWallets}
                  onPress={onPress}
                />
                <SendToPillContainer style={{marginLeft: 10}}>
                  <PillContainer>
                    <PillText accent={'action'}>
                      {nestedWallets[0].wallet.receiveAddress &&
                        formatCryptoAddress(
                          nestedWallets[0].wallet.receiveAddress,
                        )}
                    </PillText>
                  </PillContainer>
                </SendToPillContainer>
              </AddressRow>
            </>
          ) : null}
          <View style={{marginTop: -15}}>
            <FlatList
              contentContainerStyle={{paddingBottom: 20}}
              data={nestedWallets}
              keyExtractor={(_item, index) => index.toString()}
              renderItem={({
                item,
                index,
              }: {
                item: WCV2Wallet;
                index: number;
              }) => {
                return renderItem({
                  item,
                  keyId,
                  isLast,
                  showCheckbox,
                  showAddress: false,
                });
              }}
            />
          </View>
        </>
      ) : null;
    },
    [onPress],
  );

  const renderKey = useCallback(
    ({item, isLast}: {item: WCV2Key; isLast: boolean}) => {
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
                  item: WCV2Wallet[];
                  index: number;
                }) => {
                  const isLast = index === wallets.length - 1;
                  if (item.length > 1) {
                    return renderNestedWallets({
                      nestedWallets: item,
                      keyId,
                      isLast,
                      showCheckbox: false,
                    });
                  } else {
                    return renderItem({
                      item: item[0],
                      keyId,
                      isLast,
                      showCheckbox: true,
                      showAddress: true,
                    });
                  }
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
