import React, {memo} from 'react';
import styled from 'styled-components/native';
import Checkbox from '../../../components/checkbox/Checkbox';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  RowContainer,
  RowContainerWithoutFeedback,
} from '../../../components/styled/Containers';
import {WCV2Wallet} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import WCV2WalletRowInfo from './WCV2WalletRowInfo';

const CheckBoxContainer = styled.View`
  margin-right: 12px;
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
  showAddress: boolean;
  touchable: boolean;
  topic?: string;
}

const WCV2WalletRow = ({
  keyId,
  walletObj,
  onPress,
  isLast,
  showCheckbox,
  showAddress,
  topic,
  touchable,
}: Props) => {
  return touchable ? (
    <RowContainer
      isLast={isLast}
      onPress={() => onPress(keyId, walletObj)}
      style={{
        height: 74,
      }}>
      {showCheckbox ? (
        <WalletBox keyId={keyId} wallet={walletObj} onPress={onPress} />
      ) : null}
      <WCV2WalletRowInfo
        walletObj={walletObj}
        showAddress={showAddress}
        topic={topic}
      />
    </RowContainer>
  ) : (
    <RowContainerWithoutFeedback
      isLast={isLast}
      style={{
        height: 74,
      }}>
      <WCV2WalletRowInfo
        walletObj={walletObj}
        showAddress={showAddress}
        topic={topic}
      />
    </RowContainerWithoutFeedback>
  );
};

export default memo(WCV2WalletRow);
