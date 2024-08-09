import React, {memo, useCallback, useState} from 'react';
import {
  ActiveOpacity,
  ChevronContainerTouchable,
  Column,
  Row,
  RowContainer,
} from '../styled/Containers';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {FlatList, View} from 'react-native';
import {H5} from '../styled/Text';
import WalletRow, {WalletRowProps} from './WalletRow';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import styled from 'styled-components/native';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronUpSvgLight from '../../../assets/img/chevron-up-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import ChevronUpSvgDark from '../../../assets/img/chevron-up-darkmode.svg';
import {useTheme} from 'styled-components/native';

const CurrencyImageContainer = styled.View`
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

const ChainAssetsContainer = styled(Row)`
  align-items: center;
  justify-content: center;
  display: flex;
  flex-direction: row;
`;

interface Props {
  id: string;
  accountItem: AssetsByChainData;
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
  const [showChainAssets, setShowChainAssets] = useState<{
    [key: string]: boolean;
  }>({[chain]: false});
  const theme = useTheme();

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

  const onHide = () => {
    setShowChainAssets({[chain]: !showChainAssets[chain]});
  };

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
          <ChainAssetsContainer>
            {!hideBalance ? (
              <H5 numberOfLines={1} ellipsizeMode="tail">
                {fiatBalanceFormat}
              </H5>
            ) : (
              <H5>****</H5>
            )}
            <ChevronContainerTouchable onPress={onHide}>
              {showChainAssets[chain] ? (
                theme.dark ? (
                  <ChevronUpSvgDark width={10} height={6} />
                ) : (
                  <ChevronUpSvgLight width={10} height={6} />
                )
              ) : theme.dark ? (
                <ChevronDownSvgDark width={10} height={6} />
              ) : (
                <ChevronDownSvgLight width={10} height={6} />
              )}
            </ChevronContainerTouchable>
          </ChainAssetsContainer>
        </Column>
      </RowContainer>
      {showChainAssets[chain] ? (
        <FlatList<WalletRowProps>
          data={chainAssetsList}
          renderItem={memoizedRenderItem}
        />
      ) : null}
    </View>
  );
};

export default memo(AssetsByChainRow);
