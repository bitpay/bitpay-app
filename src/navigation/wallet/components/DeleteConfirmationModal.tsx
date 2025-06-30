import React from 'react';
import styled from 'styled-components/native';
import {SheetContainer} from '../../../components/styled/Containers';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import CautionSvg from '../../../../assets/img/error.svg';
import {H4, Link, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useTranslation} from 'react-i18next';

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
  const {t} = useTranslation();
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onPressCancel}>
      <SheetContainer>
        <Header>
          <CautionSvg />
          <Title>{t('Warning!')}</Title>
        </Header>

        <DeleteModalParagraph>{description}</DeleteModalParagraph>

        <ActionsContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressOk();
            }}>
            <Link>{t('DELETE')}</Link>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressCancel();
            }}>
            <SecondaryActionText>{t('NEVERMIND')}</SecondaryActionText>
          </TouchableOpacity>
        </ActionsContainer>
      </SheetContainer>
    </SheetModal>
  );
};

export default DeleteConfirmationModal;
