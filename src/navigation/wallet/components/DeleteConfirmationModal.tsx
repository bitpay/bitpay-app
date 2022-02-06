import React from 'react';
import styled from 'styled-components/native';
import {ModalContainer} from '../../../components/styled/Containers';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import CautionSvg from '../../../../assets/img/error.svg';
import {H4, Link, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';
import {TouchableOpacity} from 'react-native';

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
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
`;

const DeleteModalContainer = styled(ModalContainer)`
  min-height: 250px;
`;

const ActionsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  border-top-color: #ebebeb;
  border-top-width: 1px;
  padding-top: 20px;
`;

const SecondaryActionText = styled(Link)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const DeleteConfirmationModal = ({
  description,
  onPressOk,
  isVisible,
  onPressCancel,
}: ConfirmationModalProps) => {
  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={onPressCancel}>
      <DeleteModalContainer>
        <Header>
          <CautionSvg />
          <Title>Warning!</Title>
        </Header>

        <DeleteModalParagraph>{description}</DeleteModalParagraph>

        <ActionsContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressOk();
            }}>
            <Link>DELETE</Link>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressCancel();
            }}>
            <SecondaryActionText>NEVERMIND</SecondaryActionText>
          </TouchableOpacity>
        </ActionsContainer>
      </DeleteModalContainer>
    </BottomPopupModal>
  );
};

export default DeleteConfirmationModal;
