import {useTheme} from '../../contexts';
import React from 'react';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {SafeAreaView, StyleSheet, View} from 'react-native';
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
import {isNarrowHeight} from '../styled/Containers';

const styles = StyleSheet.create({
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalHeader: {
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
  },
  closeModalButton: {
    height: 41,
    width: 41,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderRight: {
    position: 'absolute',
    right: 5,
  },
});

type AmountModalProps = AmountProps & {
  isVisible: boolean;
  onClose: () => void;
  modalTitle?: string;
  limitsOpts?: LimitsOpts;
  onSendMaxPressed?: () => any;
};

const AmountModalContainerHOC = gestureHandlerRootHOC(
  (props: React.PropsWithChildren) => {
    const theme = useTheme();
    return (
      <SafeAreaView
        style={{
          backgroundColor: theme.dark ? Black : White,
          flex: 1,
          marginBottom: Platform.OS === 'ios' ? 25 : 10,
        }}>
        {props.children}
      </SafeAreaView>
    );
  },
);

const AmountModal: React.FC<AmountModalProps> = props => {
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

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onClose}
      fullscreen>
      <AmountModalContainerHOC>
        {showArchaxBanner && <ArchaxBanner isSmallScreen={isNarrowHeight} />}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeModalButton}
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
          </TouchableOpacity>
          {modalTitle && !showArchaxBanner ? (
            <BaseText style={styles.modalHeaderText}>{modalTitle}</BaseText>
          ) : null}
          {onSendMaxPressed ? (
            <BaseText style={styles.modalHeaderRight}>
              <Button
                buttonType="pill"
                buttonStyle="cancel"
                onPress={() => onSendMaxPressed()}>
                Send Max
              </Button>
            </BaseText>
          ) : null}
        </View>

        <Amount
          {...amountProps}
          limitsOpts={limitsOpts}
          isModal={true}
          reduceTopGap={showArchaxBanner}
        />
      </AmountModalContainerHOC>
    </SheetModal>
  );
};

export default AmountModal;
