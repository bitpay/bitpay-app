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
  livenetOnly?: boolean;
  onDismiss: (toWallet?: any) => void;
  modalContext?: 'send' | 'receive' | 'deposit';
  modalTitle?: string;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  livenetOnly,
  onDismiss,
  modalContext,
  modalTitle,
}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <GlobalSelectContainer>
        <GlobalSelect
          useAsModal={true}
          modalContext={modalContext}
          modalTitle={modalTitle}
          customSupportedCurrencies={customSupportedCurrencies}
          onDismiss={onDismiss}
          livenetOnly={livenetOnly}
        />
      </GlobalSelectContainer>
    </SheetModal>
  );
};

export default WalletSelectorModal;
