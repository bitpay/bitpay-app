import React, {ReactElement} from 'react';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {Action, SlateDark} from '../../../styles/colors';
import {ModalContainer} from '../../../components/styled/Containers';

const OptionsTitleContainer = styled.View`
  margin-bottom: 25px;
`;

const OptionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
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
  color: ${Action};
`;

const OptionDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

export interface Option {
  img: ReactElement;
  title: string;
  description: string;
  onPress: () => void;
}

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  title: string;
  options: Array<Option>;
}

const OptionsBottomPopupModal = ({
  isVisible,
  closeModal,
  title,
  options,
}: Props) => {
  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={closeModal}>
      <ModalContainer>
        <OptionsTitleContainer>
          <TextAlign align={'center'}>
            <H4>{title}</H4>
          </TextAlign>
        </OptionsTitleContainer>
        {options.map(({img, title, description, onPress}, index) => {
          return (
            <OptionContainer
              key={index}
              activeOpacity={0.75}
              onPress={() => {
                closeModal();
                onPress();
              }}>
              <OptionIconContainer>{img}</OptionIconContainer>
              <OptionTextContainer>
                <OptionTitleText>{title}</OptionTitleText>
                <OptionDescriptionText>{description}</OptionDescriptionText>
              </OptionTextContainer>
            </OptionContainer>
          );
        })}
      </ModalContainer>
    </BottomPopupModal>
  );
};

export default OptionsBottomPopupModal;
