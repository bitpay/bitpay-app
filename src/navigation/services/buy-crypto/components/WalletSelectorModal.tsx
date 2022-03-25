import React from 'react';
import GlobalSelect from '../../../../navigation/wallet/screens/GlobalSelect';
import {Black, White} from '../../../../styles/colors';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface WalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: string[];
  onDismiss: (newWallet?: any) => void;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  onDismiss,
}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <GlobalSelectContainer>
        <GlobalSelect
          useAsModal={true}
          customSupportedCurrencies={customSupportedCurrencies}
          onDismiss={onDismiss}
        />
      </GlobalSelectContainer>
    </SheetModal>
  );
};

export default WalletSelectorModal;
