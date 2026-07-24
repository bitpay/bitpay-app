import React, {memo, useState} from 'react';
import {
  ActiveOpacity,
  ChevronContainer,
  Column,
  Row,
  RowContainer,
} from '../styled/Containers';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {StyleSheet, View} from 'react-native';
import {H5} from '../styled/Text';
import WalletRow, {WalletRowProps} from './WalletRow';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronUpSvgLight from '../../../assets/img/chevron-up-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import ChevronUpSvgDark from '../../../assets/img/chevron-up-darkmode.svg';
import {useTheme} from '../../contexts';
import {setLocalAssetsDropdown} from '../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';

const styles = StyleSheet.create({
  currencyImageContainer: {
    height: 30,
    width: 30,
    display: 'flex',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
  },
  chainAssetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 3,
  },
});

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
  showNetworkHeader?: boolean;
}

const AssetsByChainRow = ({
  accountItem,
  hideIcon,
  onPress,
  isLast,
  hideBalance,
  showChainAssetsByDefault = false,
  showNetworkHeader = true,
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
      {showNetworkHeader ? (
        <RowContainer
          activeOpacity={ActiveOpacity}
          onPress={onHide}
          style={{borderBottomWidth: 0, paddingBottom: 0}}>
          <View style={styles.currencyImageContainer}>
            <CurrencyImage img={chainImg} size={20} />
          </View>
          <Column>
            <H5 ellipsizeMode="tail" numberOfLines={1}>
              {chainName}
            </H5>
          </Column>
          <Column style={{alignItems: 'flex-end'}}>
            <Row style={styles.chainAssetsContainer}>
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
            </Row>
          </Column>
        </RowContainer>
      ) : null}
      {Object.values(chainAssetsList).map((item: WalletRowProps) => {
        return showChainAssets[chain] ? (
          <WalletRow
            key={item.id}
            id={item.id}
            hideBalance={hideBalance}
            onPress={() => onPress(item.id, item.copayerId)}
            wallet={item}
          />
        ) : null;
      })}
    </View>
  );
};

export default memo(AssetsByChainRow);
