import React, {memo, useEffect} from 'react';
import styled from 'styled-components/native';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {buildTestBadge} from '../../../components/list/WalletRow';
import {
  Column,
  CurrencyImageContainer,
  Row,
} from '../../../components/styled/Containers';
import {H5, ListItemSubText} from '../../../components/styled/Text';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../../../constants/WalletConnectV2';
import {getAddressFrom} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {WCV2Wallet} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {formatCryptoAddress} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {PillContainer, PillText} from '../../wallet/components/SendToPill';
import {SendToPillContainer} from '../../wallet/screens/send/confirm/Shared';

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const CurrencyColumn = styled.View`
  margin-left: 2px;
  max-width: 35%;
`;

const Badge = styled.View`
  position: absolute;
  border-radius: 8px;
  width: 10px;
  height: 10px;
  left: 35px;
  top: 3px;
  background: #ff647c;
`;

const TestBadgeContainer = styled.View`
  margin-top: 4px;
`;

interface Props {
  walletObj: WCV2Wallet;
  showAddress: boolean;
  topic?: string;
}

const WCV2WalletRowInfo = ({walletObj, showAddress, topic}: Props) => {
  const dispatch = useAppDispatch();
  const {wallet} = walletObj;
  const requests = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests.filter(request => {
      const {chain, network} =
        WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId];
      const requestAddress = getAddressFrom(request).toLowerCase();
      const walletAddress = wallet.receiveAddress?.toLowerCase();
      return (
        request.topic === topic &&
        requestAddress === walletAddress &&
        chain === wallet.chain &&
        network === wallet.network
      );
    }),
  );

  const {hideAllBalances} = useAppSelector(({APP}) => APP);

  let {
    img,
    badgeImg,
    walletName,
    currencyName,
    balance,
    receiveAddress,
    network,
    chain,
  } = wallet;

  useEffect(() => {
    const createAddress = async () => {
      if (!receiveAddress) {
        receiveAddress = await dispatch(
          createWalletAddress({wallet, newAddress: false}),
        );
      }
    };
    createAddress();
  }, []);

  return (
    <Row>
      <CurrencyImageContainer>
        <CurrencyImage img={img} badgeUri={badgeImg} size={45} />
        {requests && requests.length ? <Badge /> : null}
      </CurrencyImageContainer>
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {walletName || currencyName}
          </H5>
          <TestBadgeContainer>
            {buildTestBadge(network, chain, false)}
          </TestBadgeContainer>
        </Row>
        <ListItemSubText style={{marginTop: -4}}>
          {!hideAllBalances ? balance?.crypto : '****'}
        </ListItemSubText>
      </CurrencyColumn>
      {receiveAddress && showAddress ? (
        <BalanceColumn>
          <SendToPillContainer>
            <PillContainer>
              <PillText accent={'action'}>
                {receiveAddress && formatCryptoAddress(receiveAddress)}
              </PillText>
            </PillContainer>
          </SendToPillContainer>
        </BalanceColumn>
      ) : null}
    </Row>
  );
};

export default memo(WCV2WalletRowInfo);
