import React from 'react';
import {ScrollView, SafeAreaView} from 'react-native';
import styled from 'styled-components/native';
import {
  ModalContainer,
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/BuyCryptoModals';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Button from '../../../../components/button/Button';

// TODO: This component is for testing purposes only. It will be replaced when we finally have the "Amount view" implemented

interface AmountModalProps {
  isVisible: boolean;
  amount: string;
  onBackdropPress?: () => void;
  onChanged?: (text: any) => any;
}

const AmountInput = styled.TextInput`
  height: 55px;
  margin: 10px 0 0 0;
  border: 1px solid #e1e4e7;
  color: black;
  padding: 10px;
`;

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const AmountModal = ({
  isVisible,
  onChanged,
  onBackdropPress,
  amount,
}: AmountModalProps) => {
  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}>
      <ModalContainer>
        <SafeAreaView>
          <ModalHeader>
            <ModalHeaderText>Enter Amount</ModalHeaderText>
            <ModalHeaderRight>
              <Button
                buttonType={'pill'}
                onPress={onBackdropPress ? onBackdropPress : () => {}}>
                Close
              </Button>
            </ModalHeaderRight>
          </ModalHeader>
          <ScrollView>
            <AmountInput
              keyboardType="numeric"
              onChangeText={text => (onChanged ? onChanged(text) : () => {})}
              value={amount}
              placeholder="Enter Amount"
              maxLength={10}
            />
            <CtaContainer>
              <Button
                buttonStyle={'primary'}
                onPress={onBackdropPress ? onBackdropPress : () => {}}>
                Accept
              </Button>
            </CtaContainer>
          </ScrollView>
        </SafeAreaView>
      </ModalContainer>
    </SheetModal>
  );
};

export default AmountModal;
