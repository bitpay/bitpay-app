import React, {memo, useEffect} from 'react';
import {View} from 'react-native';
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
import {Network} from '../../../constants';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {
  WALLET_CONNECT_SUPPORTED_CHAINS,
  WC_EVM_SUPPORTED_COINS,
} from '../../../constants/WalletConnectV2';
import {getAddressFrom} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  WCV2RequestType,
  WCV2Wallet,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {Wallet} from '../../../store/wallet/wallet.models';
import {formatCryptoAddress} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {PillContainer, PillText} from '../../wallet/components/SendToPill';
import {SendToPillContainer} from '../../wallet/screens/send/confirm/Shared';

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const CurrencyColumn = styled.View`
  margin-left: 2px;
  max-width: 40%;
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
  chainsSelected?: {chainId: string; chain: string; network: Network}[];
}

const WCV2WalletRow = ({
  keyId,
  walletObj,
  onPress,
  isLast,
  showCheckbox,
  topic,
  chainsSelected,
}: Props) => {
  const dispatch = useAppDispatch();
  const {wallet} = walletObj;
  const requests = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests.filter((request: WCV2RequestType) => {
      return (
        request.topic === topic &&
        getAddressFrom(request).toLowerCase() ===
          wallet.receiveAddress?.toLowerCase() &&
        WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId]?.chain ===
          wallet.chain
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
    id,
  } = wallet;

  useEffect(() => {
    const createAddress = async () => {
      if (!receiveAddress && !WC_EVM_SUPPORTED_COINS.includes(chain!)) {
        receiveAddress = await dispatch(
          createWalletAddress({wallet: wallet as Wallet, newAddress: false}),
        );
      }
    };
    createAddress();
  }, []);

  return (
    <RowContainer
      key={`${keyId}_${id}`}
      isLast={isLast}
      onPress={() => onPress(keyId, walletObj)}
      style={{
        height: 74,
      }}>
      {showCheckbox ? (
        <WalletBox keyId={keyId} wallet={walletObj} onPress={onPress} />
      ) : null}

      <CurrencyImageContainer>
        <CurrencyImage img={img!} badgeUri={badgeImg} size={45} />
        {requests && requests.length ? <Badge key={`${keyId}_${id}`} /> : null}
      </CurrencyImageContainer>
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {walletName || currencyName}
          </H5>
          <TestBadgeContainer>
            {buildTestBadge(network as string, chain!, false)}
          </TestBadgeContainer>
        </Row>
        <ListItemSubText style={{marginTop: -4}} numberOfLines={1}>
          {!WC_EVM_SUPPORTED_COINS.includes(chain!)
            ? !hideAllBalances
              ? balance?.crypto
              : '****'
            : 'wc support only'}
        </ListItemSubText>
      </CurrencyColumn>
      {receiveAddress ? (
        <BalanceColumn>
          <>
            <SendToPillContainer>
              <PillContainer height="30px">
                <PillText accent={'action'}>
                  {receiveAddress && formatCryptoAddress(receiveAddress)}
                </PillText>
              </PillContainer>
            </SendToPillContainer>
            {chainsSelected?.length ? (
              <Row>
                {chainsSelected.map((c, index) => {
                  if (
                    c.network !== network ||
                    c.chain === chain ||
                    !WALLET_CONNECT_SUPPORTED_CHAINS[c.chainId]
                  ) {
                    return <View key={`${keyId}_${index}`} />;
                  } else {
                    return (
                      <View style={{marginLeft: 1}} key={`${keyId}_${index}`}>
                        <CurrencyImage
                          img={CurrencyListIcons[c.chain]}
                          size={15}
                        />
                      </View>
                    );
                  }
                })}
              </Row>
            ) : null}
          </>
        </BalanceColumn>
      ) : null}
    </RowContainer>
  );
};

export default memo(WCV2WalletRow);
