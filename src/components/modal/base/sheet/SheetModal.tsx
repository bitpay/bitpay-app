import Modal from 'react-native-modal';
import React from 'react';
import {SheetParams} from '../../../styled/Containers';

interface Props extends SheetParams {
  isVisible: boolean;
  onBackdropPress: () => void;
}

const SheetModal: React.FC<Props> = ({
  children,
  isVisible,
  onBackdropPress,
  placement,
}) => {
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      testID="modalBackdrop"
      onBackdropPress={onBackdropPress}
      animationIn={placement === 'top' ? 'slideInDown' : 'slideInUp'}
      animationOut={placement === 'top' ? 'slideOutUp' : 'slideOutDown'}
      // swipeDirection={'down'}
      // onSwipeComplete={hideModal}
      style={{
        justifyContent: placement === 'top' ? 'flex-start' : 'flex-end',
        margin: 0,
      }}>
      {children}
    </Modal>
  );
};

export default SheetModal;
