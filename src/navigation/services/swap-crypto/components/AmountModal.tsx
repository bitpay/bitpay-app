import React from 'react';
import Amount from '../../../../navigation/wallet/screens/Amount';
import {Black, White} from '../../../../styles/colors';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';

const AmountContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface AmountModalProps {
  isVisible: boolean;
  currencyAbbreviation?: string;
  onDismiss: (amount?: number) => void;
}

const AmountModal: React.FC<AmountModalProps> = ({
  isVisible,
  currencyAbbreviation,
  onDismiss,
}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <AmountContainer>
        <Amount
          useAsModal={true}
          onDismiss={onDismiss}
          currencyAbbreviationProp={currencyAbbreviation}
        />
      </AmountContainer>
    </SheetModal>
  );
};

export default AmountModal;
