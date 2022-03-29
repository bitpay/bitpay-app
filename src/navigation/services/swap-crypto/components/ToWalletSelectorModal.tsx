import React from 'react';
import GlobalSelect from '../../../../navigation/wallet/screens/GlobalSelect';
import {Black, White} from '../../../../styles/colors';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface ToWalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: string[];
  onDismiss: (toWallet?: any) => void;
}

const ToWalletSelectorModal: React.FC<ToWalletSelectorModalProps> = ({
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

export default ToWalletSelectorModal;
