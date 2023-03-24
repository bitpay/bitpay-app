import React, {memo, useEffect} from 'react';
import styled from 'styled-components/native';
import Checkbox from '../../../components/checkbox/Checkbox';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import haptic from '../../../components/haptic-feedback/haptic';
import {buildTestBadge} from '../../../components/list/WalletRow';
import {
  Column,
  CurrencyImageContainer,
  Row,
  RowContainer,
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

const CheckBoxContainer = styled.View`
  margin-right: 12px;
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

interface WalletBoxProps {
  onPress: (keyId: string, wallet: WCV2Wallet) => void;
  wallet: WCV2Wallet;
  keyId: string;
}
const WalletBox = ({keyId, wallet, onPress}: WalletBoxProps) => {
  const acknowledge = (): void => {
    haptic('impactLight');
    onPress(keyId, wallet);
  };

  return (
    <CheckBoxContainer>
      <Checkbox checked={wallet.checked!} onPress={() => acknowledge()} />
    </CheckBoxContainer>
  );
};

interface Props {
  keyId: string;
  walletObj: WCV2Wallet;
  isLast?: boolean;
  onPress: (keyId: string, wallet: WCV2Wallet) => void;
  showCheckbox: boolean;
  topic?: string;
  peerId?: string;
}

const WCV2WalletRow = ({
  keyId,
  walletObj,
  onPress,
  isLast,
  showCheckbox,
  topic,
  peerId,
}: Props) => {
  const dispatch = useAppDispatch();
  const {wallet} = walletObj;
  const requests = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests.filter(
      request =>
        request.topic === topic &&
        getAddressFrom(request) === wallet.receiveAddress &&
        WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId]?.chain ===
          wallet.chain,
    ),
  );

  const requestsV1 = useAppSelector(({WALLET_CONNECT}) => {
    return WALLET_CONNECT.requests.filter(request => request.peerId === peerId);
  });
  let {
    img,
    badgeImg,
    walletName,
    currencyName,
    hideBalance,
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
    <RowContainer
      isLast={isLast}
      onPress={() => onPress(keyId, walletObj)}
      style={{
        height: 74,
      }}>
      {showCheckbox ? (
        <WalletBox keyId={keyId} wallet={walletObj} onPress={onPress} />
      ) : null}

      <CurrencyImageContainer>
        <CurrencyImage img={img} badgeUri={badgeImg} size={45} />
        {(requests && requests.length) || (requestsV1 && requestsV1.length) ? (
          <Badge />
        ) : null}
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
          {!hideBalance ? balance?.crypto : '****'}
        </ListItemSubText>
      </CurrencyColumn>
      {receiveAddress ? (
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
    </RowContainer>
  );
};

export default memo(WCV2WalletRow);
