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

const BadgeContainer = styled.View`
  margin-left: 5px;
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
  badgeImg?: string | ((props: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
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
  onPress: () => void;
}

export const buildTestBadge = (
  network: string,
  currencyName: string,
  isToken: boolean | undefined,
): ReactElement | undefined => {
  if (isToken || ['livenet', 'mainnet'].includes(network)) {
    return;
  }
  // logic for mapping test networks to chain
  const badgeLabel = currencyName === 'Ethereum' ? 'Kovan' : 'Testnet';

  return (
    <BadgeContainer>
      <Badge>{badgeLabel}</Badge>
    </BadgeContainer>
  );
};

const WalletRow = ({wallet, onPress}: Props) => {
  const {
    currencyName,
    currencyAbbreviation,
    walletName,
    img,
    badgeImg,
    cryptoBalance,
    fiatBalance,
    isToken,
    network,
    hideBalance,
    multisig,
  } = wallet;

  // @ts-ignore
  const showFiatBalance = Number(cryptoBalance.replaceAll(',', '')) > 0;

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrowIcon />
        </NestedArrowContainer>
      )}
      <CurrencyImageContainer>
        <CurrencyImage img={img} badgeUri={badgeImg} size={45} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {walletName || currencyName}
          </H5>
          {buildTestBadge(network, currencyName, isToken)}
        </Row>
        <ListItemSubText>
          {currencyAbbreviation.toUpperCase()} {multisig ? multisig : null}
        </ListItemSubText>
      </CurrencyColumn>
      <BalanceColumn>
        {!hideBalance ? (
          <>
            <H5>{cryptoBalance}</H5>
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
