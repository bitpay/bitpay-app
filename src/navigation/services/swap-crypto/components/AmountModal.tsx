import React from 'react';
import Amount from '../../../../navigation/wallet/screens/Amount';
import {Black, White} from '../../../../styles/colors';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';

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
  const AmountComponent = gestureHandlerRootHOC(() => {
    return (
      <AmountContainer>
        <Amount
          useAsModal={true}
          onDismiss={onDismiss}
          currencyAbbreviationProp={currencyAbbreviation}
        />
      </AmountContainer>
    );
  });

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <AmountComponent />
    </SheetModal>
  );
};

export default AmountModal;
