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
import {Platform} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useAppSelector} from '../../utils/hooks';
import ArchaxBanner from '../archax/archax-banner';
import {HEIGHT} from '../styled/Containers';

const ModalHeaderText = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
`;
const ModalHeader = styled.View`
  margin: 10px 10px 10px 10px;
`;

const CloseModalButton = styled(TouchableOpacity)`
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

const StyledAmountModalContainer = styled.SafeAreaView<{platform: string}>`
  background-color: ${({theme}) => (theme.dark ? Black : White)};
  flex: 1;
  margin-bottom: ${({platform}) => (platform === 'ios' ? 25 : 10)}px;
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
    <StyledAmountModalContainer platform={Platform.OS}>
      {props.children}
    </StyledAmountModalContainer>
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
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const isSmallScreen = HEIGHT < 700;

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onClose}
      fullscreen>
      <AmountModalContainerHOC>
        {showArchaxBanner && <ArchaxBanner isSmallScreen={isSmallScreen} />}
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
          {modalTitle && !showArchaxBanner ? (
            <ModalHeaderText>{modalTitle}</ModalHeaderText>
          ) : null}
          {onSendMaxPressed &&
          (!props.context ||
            !['sellCrypto', 'swapCrypto'].includes(props.context)) ? (
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
          isModal={true}
          reduceTopGap={showArchaxBanner}
          onSendMaxPressed={onSendMaxPressed}
        />
      </AmountModalContainerHOC>
    </SheetModal>
  );
};

export default AmountModal;
