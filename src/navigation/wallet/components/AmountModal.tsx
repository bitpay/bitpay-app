import React from 'react';
import styled from 'styled-components/native';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {Black, White} from '../../../styles/colors';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import Amount from '../screens/Amount';

const AmountContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface AmountModalProps {
  isVisible: boolean;
  onDismiss: (amount?: number) => void;
  opts: {
    context?: string;
    hideSendMax?: boolean;
    currencyAbbreviation?: string;
  };
}

const AmountModalWrapper = gestureHandlerRootHOC(props => {
  return <AmountContainer>{props.children}</AmountContainer>;
});

const AmountModal: React.FC<AmountModalProps> = ({
  isVisible,
  onDismiss,
  opts,
}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <AmountModalWrapper>
        <Amount
          useAsModal={true}
          onDismiss={onDismiss}
          hideSendMaxProp={opts.hideSendMax}
          contextProp={opts.context}
          currencyAbbreviationProp={opts.currencyAbbreviation}
        />
      </AmountModalWrapper>
    </SheetModal>
  );
};

export default AmountModal;
