import React, {ReactElement} from 'react';
import TopPopupModal from '../../../../components/modal/base/top-popup/TopPopupModal';
import {BaseText} from '../../../../components/styled/Text';
import {SlateDark} from '../../../../styles/colors';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  SheetContainer as ParentModalContainer,
} from '../../../../components/styled/Containers';

const OptionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding: 30px 0;
  align-items: stretch;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ebecee')};
  border-bottom-width: 1px;
`;

const OptionIconContainer = styled.View`
  justify-content: center;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
`;

const ModalContainer = styled(ParentModalContainer)`
  min-height: 100px;
  padding: 0 20px;
`;

export interface Option {
  img?: ReactElement;
  title: string;
  onPress: () => void;
}

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  title: string;
  options: Array<Option>;
}

const ContactOptionsModal = ({isVisible, closeModal, options}: Props) => {
  return (
    <TopPopupModal isVisible={isVisible} onBackdropPress={closeModal}>
      <ModalContainer>
        {options.map(({img, title: optionTitle, onPress}, index) => (
          <OptionContainer
            key={index}
            activeOpacity={ActiveOpacity}
            onPress={() => {
              closeModal();
              onPress();
            }}>
            <OptionIconContainer>{img}</OptionIconContainer>
            <OptionTextContainer>
              <OptionTitleText>{optionTitle}</OptionTitleText>
            </OptionTextContainer>
          </OptionContainer>
        ))}
      </ModalContainer>
    </TopPopupModal>
  );
};

export default ContactOptionsModal;
