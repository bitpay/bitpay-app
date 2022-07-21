import {useTheme} from '@react-navigation/native';
import React from 'react';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import CloseModal from '../../../assets/img/close-modal-icon.svg';
import Button from '../../components/button/Button';
import {BaseText} from '../../components/styled/Text';
import {Black, White} from '../../styles/colors';
import SheetModal from '../modal/base/sheet/SheetModal';
import Amount, {AmountProps} from './Amount';

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
`;

const CloseModalButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  top: 20px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalHeaderRight = styled(BaseText)`
  position: absolute;
  right: 5px;
  top: 20px;
`;

const StyledAmountModalContainer = styled.SafeAreaView`
  background-color: ${({theme}) => (theme.dark ? Black : White)};
  flex: 1;
  padding-bottom: 45px;
`;

type AmountModalProps = AmountProps & {
  isVisible: boolean;
  onClose: () => void;
  onSendMaxPressed?: () => any;
};

const AmountModalContainerHOC = gestureHandlerRootHOC(props => {
  return (
    <StyledAmountModalContainer>{props.children}</StyledAmountModalContainer>
  );
});

const AmountModal: React.VFC<AmountModalProps> = props => {
  const {onClose, onSendMaxPressed, isVisible, ...amountProps} = props;
  const theme = useTheme();

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onClose}>
      <AmountModalContainerHOC>
        <ModalHeader>
          <CloseModalButton
            onPress={() => {
              onClose?.();
            }}>
            <CloseModal
              {...{
                width: 20,
                height: 20,
                color: theme.dark ? 'white' : 'black',
              }}
            />
          </CloseModalButton>

          {onSendMaxPressed ? (
            <ModalHeaderRight>
              <Button
                buttonType="pill"
                buttonStyle="cancel"
                onPress={() => onSendMaxPressed()}>
                Send Max
              </Button>
            </ModalHeaderRight>
          ) : null}
        </ModalHeader>

        <Amount {...amountProps} />
      </AmountModalContainerHOC>
    </SheetModal>
  );
};

export default AmountModal;
