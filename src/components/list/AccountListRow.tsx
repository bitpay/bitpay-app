import React, {memo, ReactElement, useEffect, useState} from 'react';
import {
  Column,
  CurrencyImageContainer,
  Row,
  ActiveOpacity,
  RowContainer,
  BadgeContainer,
} from '../styled/Containers';
import {Badge, H5, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {
  formatCurrencyAbbreviation,
  getProtocolName,
} from '../../utils/helper-methods';
import {ActivityIndicator, Platform, View} from 'react-native';
import {ProgressBlue} from '../../styles/colors';
import {WalletRowProps} from './WalletRow';
import {SearchableItem} from '../chain-search/ChainSearch';
import Animated, {FadeIn} from 'react-native-reanimated';
import {IsSVMChain} from '../../store/wallet/utils/currency';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';

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

const ListContainer = styled(Animated.View)``;

export interface AccountRowListBase extends SearchableItem {}

export type AccountRowListProps = AccountRowListBase & AccountRowProps[];
export interface AccountRowProps extends SearchableItem {
  id: string;
  keyId: string;
  copayerId?: string;
  chains: string[];
  wallets: WalletRowProps[];
  accountName: string;
  accountNumber: number;
  receiveAddress: string;
  isMultiNetworkSupported: boolean;
  fiatBalance: number;
  fiatLockedBalance: number;
  fiatConfirmedLockedBalance: number;
  fiatSpendableBalance: number;
  fiatPendingBalance: number;
  fiatBalanceFormat: string;
  fiatLockedBalanceFormat: string;
  fiatConfirmedLockedBalanceFormat: string;
  fiatSpendableBalanceFormat: string;
  fiatPendingBalanceFormat: string;
}

interface Props {
  id: string;
  accountItem: AccountRowProps;
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

const AccountListRow = ({
  accountItem,
  hideIcon,
  onPress,
  isLast,
  hideBalance,
}: Props) => {
  const {
    accountName,
    fiatBalanceFormat,
    receiveAddress,
    wallets,
    isMultiNetworkSupported,
  } = accountItem;
  const {
    currencyAbbreviation,
    isToken,
    network,
    multisig,
    isComplete,
    isScanning,
    cryptoBalance,
    chain,
  } = wallets[0];

  const _currencyAbbreviation =
    formatCurrencyAbbreviation(currencyAbbreviation);

  const showFiatBalance = Number(cryptoBalance.replaceAll(',', '')) > 0;

  const [isBlockieReady, setIsBlockieReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlockieReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ListContainer entering={FadeIn.duration(800)}>
      <RowContainer
        activeOpacity={ActiveOpacity}
        onPress={onPress}
        style={{borderBottomWidth: isLast || !hideIcon ? 0 : 1}}>
        {!hideIcon ? (
          <CurrencyImageContainer>
            {isMultiNetworkSupported ? (
              isBlockieReady ? (
                <CurrencyImage
                  blockie={{
                    seed: receiveAddress,
                  }}
                  badgeUri={
                    IsSVMChain(chain) ? CurrencyListIcons[chain] : undefined
                  }
                  size={40}
                />
              ) : (
                <></>
              )
            ) : (
              <CurrencyImage
                img={wallets[0].img}
                badgeUri={wallets[0].badgeImg}
                size={40}
              />
            )}
          </CurrencyImageContainer>
        ) : null}
        {isMultiNetworkSupported ? (
          <Column>
            <H5 ellipsizeMode={'tail'} numberOfLines={1}>
              {accountName}
            </H5>
          </Column>
        ) : (
          <Column>
            <Row>
              <H5 ellipsizeMode="tail" numberOfLines={1}>
                {accountName}
              </H5>
            </Row>
            <Row style={{alignItems: 'center'}}>
              <ListItemSubText
                ellipsizeMode="tail"
                numberOfLines={1}
                style={{marginTop: Platform.OS === 'ios' ? 2 : 0}}>
                {`${_currencyAbbreviation} ${multisig ? multisig : ''}`}
              </ListItemSubText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: 5,
                  marginTop: 2,
                }}>
                {buildTestBadge(network, chain, isToken)}
                {buildUncompleteBadge(isComplete)}
              </View>
            </Row>
          </Column>
        )}
        {isMultiNetworkSupported ? (
          fiatBalanceFormat && (
            <BalanceColumn>
              {!hideBalance ? (
                <H5 numberOfLines={1} ellipsizeMode="tail">
                  {fiatBalanceFormat}
                </H5>
              ) : (
                <H5 style={{marginTop: 8}}>****</H5>
              )}
            </BalanceColumn>
          )
        ) : !isScanning ? (
          cryptoBalance && (
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
                <H5 style={{marginTop: 8}}>****</H5>
              )}
            </BalanceColumn>
          )
        ) : (
          <SpinnerContainer>
            <ActivityIndicator color={ProgressBlue} />
          </SpinnerContainer>
        )}
      </RowContainer>
    </ListContainer>
  );
};

export default memo(AccountListRow);
