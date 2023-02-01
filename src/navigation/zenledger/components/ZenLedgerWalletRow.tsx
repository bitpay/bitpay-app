import React, {memo} from 'react';
import styled from 'styled-components/native';
import Checkbox from '../../../components/checkbox/Checkbox';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  Column,
  CurrencyImageContainer,
  RowContainer,
} from '../../../components/styled/Containers';
import {H5, ListItemSubText} from '../../../components/styled/Text';
import {ZenLedgerWalletObj} from '../../../store/zenledger/zenledger.models';
import {formatCryptoAddress} from '../../../utils/helper-methods';
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

interface WalletBoxProps {
  onPress: (keyId: string, wallet: ZenLedgerWalletObj) => void;
  wallet: ZenLedgerWalletObj;
  isSelected: boolean;
  keyId: string;
}
const WalletBox = ({keyId, wallet, onPress}: WalletBoxProps) => {
  const acknowledge = (): void => {
    haptic('impactLight');
    onPress(keyId, wallet);
  };

  return (
    <CheckBoxContainer>
      <Checkbox checked={wallet.checked} onPress={() => acknowledge()} />
    </CheckBoxContainer>
  );
};

interface Props {
  keyId: string;
  wallet: ZenLedgerWalletObj;
  isLast?: boolean;
  onPress: (keyId: string, wallet: ZenLedgerWalletObj) => void;
  selectAll: boolean;
}

const ZenLedgerWalletRow = ({
  keyId,
  wallet: _wallet,
  onPress,
  isLast,
  selectAll,
}: Props) => {
  const {wallet, fiatBalance} = _wallet;
  const {img, badgeImg, walletName, currencyName, hideBalance, receiveAddress} =
    wallet;
  return (
    <RowContainer
      isLast={isLast}
      disabled={true}
      style={{
        marginLeft: 32,
        height: 74,
      }}>
      <WalletBox
        keyId={keyId}
        wallet={_wallet}
        onPress={onPress}
        isSelected={selectAll}
      />

      <CurrencyImageContainer>
        <CurrencyImage img={img} badgeUri={badgeImg} size={45} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5 ellipsizeMode="tail" numberOfLines={1}>
          {walletName || currencyName}
        </H5>
        <ListItemSubText style={{marginTop: -4}}>
          {!hideBalance ? fiatBalance : '****'}
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

export default memo(ZenLedgerWalletRow);
