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
  onDismiss: (amount?: number) => void;
}

const AmountModalWrapper = gestureHandlerRootHOC(props => {
  return <AmountContainer>{props.children}</AmountContainer>;
});

const AmountModal: React.FC<AmountModalProps> = ({isVisible, onDismiss}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <AmountModalWrapper>
        <Amount useAsModal={true} onDismiss={onDismiss} />
      </AmountModalWrapper>
    </SheetModal>
  );
};

export default AmountModal;
