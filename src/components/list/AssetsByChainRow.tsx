import React, {memo, useCallback, useState} from 'react';
import {
  ActiveOpacity,
  ChevronContainer,
  Column,
  Row,
  RowContainer,
} from '../styled/Containers';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {View} from 'react-native';
import {H5} from '../styled/Text';
import WalletRow, {WalletRowProps} from './WalletRow';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import styled from 'styled-components/native';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronUpSvgLight from '../../../assets/img/chevron-up-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import ChevronUpSvgDark from '../../../assets/img/chevron-up-darkmode.svg';
import {useTheme} from 'styled-components/native';
import {setLocalAssetsDropdown} from '../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';

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
  gap: 3px;
`;

export interface LocalAssetsDropdown {
  [account: string]: {
    [chain: string]: boolean;
  };
}
interface Props {
  id: string;
  accountItem: AssetsByChainData;
  hideIcon?: boolean;
  isLast?: boolean;
  onPress: (walletId: string, copayerId?: string) => void;
  hideBalance: boolean;
  showChainAssetsByDefault?: boolean;
}

const AssetsByChainRow = ({
  accountItem,
  hideIcon,
  onPress,
  isLast,
  hideBalance,
  showChainAssetsByDefault = false,
}: Props) => {
  const {chain, chainName, fiatBalanceFormat, chainAssetsList, chainImg} =
    accountItem;
  const dispatch = useAppDispatch();
  const selectedLocalAssetsDropdown = useAppSelector(
    ({APP}) => APP.selectedLocalAssetsDropdown,
  );
  const initialSelected = showChainAssetsByDefault
    ? {[chain]: showChainAssetsByDefault}
    : selectedLocalAssetsDropdown?.[accountItem.accountAddress] || {};
  const [showChainAssets, setShowChainAssets] = useState<{
    [key: string]: boolean;
  }>(initialSelected);
  const theme = useTheme();

  const memoizedRenderItem = useCallback(
    ({item}: {item: WalletRowProps}) => {
      return (
        <WalletRow
          id={item.id}
          hideBalance={hideBalance}
          onPress={() => onPress(item.id, item.copayerId)}
          wallet={item}
        />
      );
    },
    [hideBalance],
  );

  const onHide = () => {
    setShowChainAssets({[chain]: !showChainAssets[chain]});
    dispatch(
      setLocalAssetsDropdown({
        ...selectedLocalAssetsDropdown,
        [accountItem.accountAddress]: {
          ...selectedLocalAssetsDropdown?.[accountItem.accountAddress],
          [chain]: !showChainAssets[chain],
        },
      }),
    );
  };

  return (
    <View>
      <RowContainer
        activeOpacity={ActiveOpacity}
        onPress={onHide}
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
              <H5 style={{marginTop: 8}}>****</H5>
            )}
            <ChevronContainer>
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
            </ChevronContainer>
          </ChainAssetsContainer>
        </Column>
      </RowContainer>
      {Object.values(chainAssetsList).map(item => {
        return showChainAssets[chain] ? memoizedRenderItem({item}) : null;
      })}
    </View>
  );
};

export default memo(AssetsByChainRow);
