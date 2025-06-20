import React, {memo, ReactElement} from 'react';
import {
  Column,
  CurrencyImageContainer,
  CurrencyColumn,
  Row,
  ActiveOpacity,
  RowContainer,
  BadgeContainer,
} from '../styled/Containers';
import {Badge, H5, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {Network} from '../../constants';
import {BitpaySupportedEvmCoins} from '../../constants/currencies';
import {TransactionProposal} from '../../store/wallet/wallet.models';
import {CoinbaseAccountProps} from '../../api/coinbase/coinbase.types';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {
  formatCryptoAddress,
  formatCurrencyAbbreviation,
  getProtocolName,
} from '../../utils/helper-methods';
import {ActivityIndicator, Platform} from 'react-native';
import {ProgressBlue} from '../../styles/colors';
import {SearchableItem} from '../chain-search/ChainSearch';
import {IsERCToken, IsVMChain} from '../../store/wallet/utils/currency';
import GasTokenSvg from '../../../assets/img/gas-token.svg';

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-right: 10px;
`;

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const NestedArrowContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

export interface WalletRowProps extends SearchableItem {
  id: string;
  keyId?: string;
  copayerId?: string;
  img: string | ((props: any) => ReactElement);
  badgeImg?: string | ((props?: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  tokenAddress?: string;
  chain: string;
  chainName: string;
  walletName?: string;
  cryptoBalance: string;
  cryptoLockedBalance: string;
  cryptoConfirmedLockedBalance: string;
  cryptoSpendableBalance: string;
  cryptoPendingBalance: string;
  fiatBalance?: number;
  fiatLockedBalance?: number;
  fiatConfirmedLockedBalance?: number;
  fiatSpendableBalance?: number;
  fiatPendingBalance?: number;
  fiatBalanceFormat?: string;
  fiatLockedBalanceFormat?: string;
  fiatConfirmedLockedBalanceFormat?: string;
  fiatSpendableBalanceFormat?: string;
  fiatPendingBalanceFormat?: string;
  isToken?: boolean;
  network: Network;
  isRefreshing?: boolean;
  isScanning?: boolean;
  hideWallet?: boolean;
  hideWalletByAccount?: boolean;
  hideBalance?: boolean;
  pendingTxps: TransactionProposal[];
  coinbaseAccount?: CoinbaseAccountProps;
  multisig?: string;
  isComplete?: boolean;
  receiveAddress?: string;
  account?: number;
}

interface Props {
  id: string;
  wallet: WalletRowProps;
  hideIcon?: boolean;
  isLast?: boolean;
  noBorder?: boolean;
  onPress: () => void;
  hideBalance: boolean;
}

export const buildPreviewAddress = (
  chain: string,
  isComplete: boolean | undefined,
  multisig: string | undefined,
  receiveAddress: string | undefined,
  isToken: boolean | undefined,
): ReactElement | undefined => {
  const canHaveTokens = !!BitpaySupportedEvmCoins[chain];
  if (!isComplete || multisig || !receiveAddress || isToken || !canHaveTokens) {
    return;
  }

  return (
    <BadgeContainer>
      <Badge>{formatCryptoAddress(receiveAddress)}</Badge>
    </BadgeContainer>
  );
};

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

export const buildUncompleteBadge = (
  isComplete: boolean | undefined,
): ReactElement | undefined => {
  if (isComplete) {
    return;
  }
  // logic for mapping test networks to chain
  const badgeLabel = 'Incomplete';

  return (
    <BadgeContainer>
      <Badge>{badgeLabel}</Badge>
    </BadgeContainer>
  );
};

export const buildGasTokenBadge = (
  IsVMChain: boolean | undefined,
): ReactElement | undefined => {
  if (!IsVMChain) {
    return;
  }
  const badgeLabel = 'Gas Token';

  return (
    <BadgeContainer>
      <GasTokenSvg />
      <Badge>{badgeLabel}</Badge>
    </BadgeContainer>
  );
};

const WalletRow = ({
  wallet,
  hideIcon,
  onPress,
  isLast,
  hideBalance,
  noBorder,
}: Props) => {
  const {
    currencyName,
    currencyAbbreviation,
    chain,
    walletName,
    img,
    badgeImg,
    cryptoBalance,
    fiatBalanceFormat,
    isToken,
    network,
    multisig,
    isScanning,
    isComplete,
  } = wallet;

  // @ts-ignore
  const showFiatBalance = Number(cryptoBalance.replaceAll(',', '')) > 0;
  const _currencyAbbreviation =
    formatCurrencyAbbreviation(currencyAbbreviation);

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={{borderBottomWidth: isLast || !hideIcon ? 0 : 1}}
      noBorder={noBorder}>
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
            {_currencyAbbreviation} {multisig ? `${multisig} ` : null}
          </ListItemSubText>
          <Row style={{alignItems: 'center', marginLeft: 2, marginTop: 2}}>
            {buildGasTokenBadge(
              !IsERCToken(currencyAbbreviation, chain) && IsVMChain(chain),
            )}
            {buildTestBadge(network, chain, isToken)}
            {buildUncompleteBadge(isComplete)}
          </Row>
        </Row>
      </CurrencyColumn>
      {!isScanning ? (
        <BalanceColumn>
          {!hideBalance ? (
            <>
              <H5 numberOfLines={1} ellipsizeMode="tail">
                {cryptoBalance}
              </H5>
              {showFiatBalance && (
                <ListItemSubText textAlign={'right'}>
                  {network === 'testnet'
                    ? 'Test - No Value'
                    : fiatBalanceFormat}
                </ListItemSubText>
              )}
            </>
          ) : (
            <H5>****</H5>
          )}
        </BalanceColumn>
      ) : (
        <SpinnerContainer>
          <ActivityIndicator color={ProgressBlue} />
        </SpinnerContainer>
      )}
    </RowContainer>
  );
};

export default memo(WalletRow);
