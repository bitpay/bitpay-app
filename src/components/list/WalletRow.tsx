import React, {memo, ReactElement} from 'react';
import {
  Column,
  CurrencyImageContainer,
  CurrencyColumn,
  Row,
  ActiveOpacity,
  RowContainer,
} from '../styled/Containers';
import {Badge, H5, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {Network} from '../../constants';
import {TransactionProposal} from '../../store/wallet/wallet.models';
import {CoinbaseAccountProps} from '../../api/coinbase/coinbase.types';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {getProtocolName} from '../../utils/helper-methods';
import {Platform} from 'react-native';

const BadgeContainer = styled.View`
  margin-left: 3px;
  margin-bottom: -2px;
`;

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const NestedArrowContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

export interface WalletRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  badgeImg?: string | ((props?: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  tokenAddress?: string;
  chain: string;
  walletName?: string;
  cryptoBalance: string;
  cryptoLockedBalance?: string;
  cryptoConfirmedLockedBalance?: string;
  cryptoSpendableBalance?: string;
  cryptoPendingBalance?: string;
  fiatBalance: string;
  fiatLockedBalance?: string;
  fiatConfirmedLockedBalance?: string;
  fiatSpendableBalance?: string;
  fiatPendingBalance?: string;
  isToken?: boolean;
  network: Network;
  isRefreshing?: boolean;
  hideWallet?: boolean;
  hideBalance?: boolean;
  pendingTxps: TransactionProposal[];
  coinbaseAccount?: CoinbaseAccountProps;
  multisig?: string;
}

interface Props {
  id: string;
  wallet: WalletRowProps;
  hideIcon?: boolean;
  isLast?: boolean;
  onPress: () => void;
  hideBalance: boolean;
}

export const buildTestBadge = (
  network: string,
  chain: string,
  isToken: boolean | undefined,
): ReactElement | undefined => {
  if (isToken || ['livenet', 'mainnet'].includes(network)) {
    return;
  }
  // logic for mapping test networks to chain
  const badgeLabel = getProtocolName(chain, network);

  return (
    <BadgeContainer>
      <Badge>{badgeLabel}</Badge>
    </BadgeContainer>
  );
};

const WalletRow = ({wallet, hideIcon, onPress, isLast, hideBalance}: Props) => {
  const {
    currencyName,
    currencyAbbreviation,
    chain,
    walletName,
    img,
    badgeImg,
    cryptoBalance,
    fiatBalance,
    isToken,
    network,
    multisig,
  } = wallet;

  // @ts-ignore
  const showFiatBalance = Number(cryptoBalance.replaceAll(',', '')) > 0;

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={{borderBottomWidth: isLast || !hideIcon ? 0 : 1}}>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrowIcon />
        </NestedArrowContainer>
      )}
      {!hideIcon ? (
        <CurrencyImageContainer>
          <CurrencyImage img={img} badgeUri={badgeImg} size={45} />
        </CurrencyImageContainer>
      ) : null}
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {walletName || currencyName}
          </H5>
        </Row>
        <Row style={{alignItems: 'center'}}>
          <ListItemSubText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{marginTop: Platform.OS === 'ios' ? 2 : 0}}>
            {currencyAbbreviation.toUpperCase()}{' '}
            {multisig ? `${multisig} ` : null}
          </ListItemSubText>
          {buildTestBadge(network, chain, isToken)}
        </Row>
      </CurrencyColumn>
      <BalanceColumn>
        {!hideBalance ? (
          <>
            <H5 numberOfLines={1} ellipsizeMode="tail">
              {cryptoBalance}
            </H5>
            {showFiatBalance && (
              <ListItemSubText textAlign={'right'}>
                {network === 'testnet' ? 'Test - No Value' : fiatBalance}
              </ListItemSubText>
            )}
          </>
        ) : (
          <H5>****</H5>
        )}
      </BalanceColumn>
    </RowContainer>
  );
};

export default memo(WalletRow);
