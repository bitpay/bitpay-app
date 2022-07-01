import React from 'react';
import Amount from '../../../wallet/screens/Amount';
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
  onDismiss: (
    amount?: number,
    opts?: {sendMax?: boolean; close?: boolean},
  ) => void;
}

const AmountComponent = gestureHandlerRootHOC<
  Omit<AmountModalProps, 'isVisible'>
>(props => {
  const {currencyAbbreviation, onDismiss} = props;

  return (
    <AmountContainer>
      <Amount
        useAsModal={true}
        hideSendMaxProp={false}
        onDismiss={onDismiss}
        currencyAbbreviationProp={currencyAbbreviation}
      />
    </AmountContainer>
  );
});

const AmountModal: React.FC<AmountModalProps> = ({
  isVisible,
  currencyAbbreviation,
  onDismiss,
}) => {
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <AmountComponent
        currencyAbbreviation={currencyAbbreviation}
        onDismiss={onDismiss}
      />
    </SheetModal>
  );
};

export default AmountModal;
