import React, {memo, ReactElement} from 'react';
import {
  Column,
  CurrencyImageContainer,
  CurrencyColumn,
  Row,
  ActiveOpacity,
  RowContainer,
} from '../styled/Containers';
import {Badge, H5, H7} from '../styled/Text';
import styled from 'styled-components/native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {SUPPORTED_CURRENCIES} from '../../constants/currencies';
import {Network} from '../../constants';
import {TransactionProposal} from '../../store/wallet/wallet.models';
import {Black, LuckySevens} from '../../styles/colors';

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

const SubText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? LuckySevens : Black)};
`;

export interface WalletRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  walletName?: string;
  cryptoBalance: string;
  cryptoLockedBalance?: string;
  fiatBalance: string;
  fiatLockedBalance?: string;
  isToken?: boolean;
  network: Network;
  isRefreshing?: boolean;
  hideWallet?: boolean;
  hideBalance?: boolean;
  pendingTxps: TransactionProposal[];
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
    cryptoBalance,
    fiatBalance,
    isToken,
    network,
    hideBalance,
  } = wallet;

  // @ts-ignore
  const showFiatBalance = Number(cryptoBalance.replaceAll(',', '')) > 0;

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrow />
        </NestedArrowContainer>
      )}
      <CurrencyImageContainer>
        <CurrencyImage img={img} size={45} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {walletName || currencyName}
          </H5>
          {buildTestBadge(network, currencyName, isToken)}
        </Row>
        <SubText>{currencyAbbreviation.toUpperCase()}</SubText>
      </CurrencyColumn>
      <BalanceColumn>
        {!hideBalance ? (
          <>
            <H5>{cryptoBalance}</H5>
            {showFiatBalance && (
              <SubText>
                {network === 'testnet' ? 'Test - No Value' : fiatBalance}
              </SubText>
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
