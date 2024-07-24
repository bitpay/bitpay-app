import React, {memo, useCallback} from 'react';
import {ActiveOpacity, Column, Row, RowContainer} from '../styled/Containers';
import {AssetsByChainListProps} from '../../navigation/wallet/screens/AccountDetails';
import {FlatList, View} from 'react-native';
import {BaseText, H5} from '../styled/Text';
import WalletRow, {WalletRowProps} from './WalletRow';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import styled from 'styled-components/native';

const CurrencyImageContainer = styled.View`
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

interface Props {
  id: string;
  accountItem: AssetsByChainListProps;
  hideIcon?: boolean;
  isLast?: boolean;
  onPress: (walletId: string) => void;
  hideBalance: boolean;
}

const AssetsByChainRow = ({
  accountItem,
  hideIcon,
  onPress,
  isLast,
  hideBalance,
}: Props) => {
  const {chain, chainName, fiatBalanceFormat, chainAssetsList, chainImg} =
    accountItem;

  const memoizedRenderItem = useCallback(({item}: {item: WalletRowProps}) => {
    return (
      <WalletRow
        id={item.id}
        hideBalance={false}
        isLast={false}
        onPress={() => onPress(item.id)}
        wallet={item}
      />
    );
  }, []);

  return (
    <View>
      <RowContainer
        activeOpacity={ActiveOpacity}
        onPress={() => {}}
        style={{borderBottomWidth: 0, paddingBottom: 0}}>
        <CurrencyImageContainer>
          <CurrencyImage img={chainImg} size={20} />
        </CurrencyImageContainer>
        <Column>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {chainName}
          </H5>
        </Column>
        <Column style={{alignItems: 'flex-end'}}>
          {!hideBalance ? (
            <H5 numberOfLines={1} ellipsizeMode="tail">
              {fiatBalanceFormat}
            </H5>
          ) : (
            <H5>****</H5>
          )}
        </Column>
      </RowContainer>
      <FlatList<WalletRowProps>
        data={chainAssetsList}
        renderItem={memoizedRenderItem}
      />
    </View>
  );
};

export default memo(AssetsByChainRow);
