import React from 'react';
import styled from 'styled-components/native';
import {ModalContainer} from '../../../components/styled/Containers';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import CautionSvg from '../../../../assets/img/error.svg';
import {H4, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';

interface ConfirmationModalProps {
  description: string;
  onPressOk: () => void;
  isVisible: boolean;
  onPressCancel: () => void;
}

const Header = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Title = styled(H4)`
  margin-left: 10px;
`;

const DeleteModalParagraph = styled(Paragraph)`
  margin: 15px 0 20px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ActionsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  border-top-color: #ebebeb;
  border-top-width: 1px;
  padding-top: 20px;
`;

const Action = styled.TouchableOpacity``;

const PrimaryActionText = styled(Paragraph)``;

const SecondaryActionText = styled(Paragraph)``;
const DeleteConfirmationModal = ({
  description,
  onPressOk,
  isVisible,
  onPressCancel,
}: ConfirmationModalProps) => {
  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={onPressCancel}>
      <ModalContainer>
        <Header>
          <CautionSvg />
          <Title>Warning!</Title>
        </Header>

        <DeleteModalParagraph>{description}</DeleteModalParagraph>

        <ActionsContainer>
          <Action
            onPress={() => {
              haptic('impactLight');
              onPressOk();
            }}>
            <PrimaryActionText>DELETE</PrimaryActionText>
          </Action>
          <Action
            onPress={() => {
              haptic('impactLight');
              onPressCancel();
            }}>
            <SecondaryActionText>NEVERMIND</SecondaryActionText>
          </Action>
        </ActionsContainer>
      </ModalContainer>
    </BottomPopupModal>
  );
};

export default DeleteConfirmationModal;
