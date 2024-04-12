import {useTheme} from '@react-navigation/native';
import React from 'react';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import CloseModal from '../../../assets/img/close-modal-icon.svg';
import Button from '../../components/button/Button';
import {BaseText} from '../../components/styled/Text';
import {Black, White} from '../../styles/colors';
import SheetModal from '../modal/base/sheet/SheetModal';
import Amount, {AmountProps, LimitsOpts} from './Amount';

const ModalHeaderText = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
`;
const ModalHeader = styled.View`
  height: 50px;
  margin: 10px 10px 10px 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CloseModalButton = styled.TouchableOpacity`
  position: absolute;
  left: 10px;
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
`;

const StyledAmountModalContainer = styled.SafeAreaView`
  background-color: ${({theme}) => (theme.dark ? Black : White)};
  flex: 1;
  padding-bottom: 45px;
`;

type AmountModalProps = AmountProps & {
  isVisible: boolean;
  onClose: () => void;
  modalTitle?: string;
  limitsOpts?: LimitsOpts;
  onSendMaxPressed?: () => any;
};

const AmountModalContainerHOC = gestureHandlerRootHOC(props => {
  return (
    <StyledAmountModalContainer>{props.children}</StyledAmountModalContainer>
  );
});

const AmountModal: React.VFC<AmountModalProps> = props => {
  const {
    onClose,
    onSendMaxPressed,
    isVisible,
    modalTitle,
    limitsOpts,
    ...amountProps
  } = props;
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
          {modalTitle ? <ModalHeaderText>{modalTitle}</ModalHeaderText> : null}
          {onSendMaxPressed && !limitsOpts?.limits.maxAmount ? (
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

        <Amount
          {...amountProps}
          limitsOpts={limitsOpts}
          onSendMaxPressed={onSendMaxPressed}
        />
      </AmountModalContainerHOC>
    </SheetModal>
  );
};

export default AmountModal;
