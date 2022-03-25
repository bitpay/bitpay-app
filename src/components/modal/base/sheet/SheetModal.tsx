import Modal from 'react-native-modal';
import React from 'react';
import {SheetParams} from '../../../styled/Containers';
import {useAppSelector} from '../../../../utils/hooks';
import Blur from '../../../blur/Blur';

interface Props extends SheetParams {
  isVisible: boolean;
  onBackdropPress: (props?: any) => void;
}

const SheetModal: React.FC<Props> = ({
  children,
  isVisible,
  onBackdropPress,
  placement,
}) => {
  const showBlur = useAppSelector(({APP}) => APP.showBlur);
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
        position: 'relative',
        justifyContent: placement === 'top' ? 'flex-start' : 'flex-end',
        margin: 0,
      }}>
      <>
        {children}
        {showBlur && <Blur />}
      </>
    </Modal>
  );
};

export default SheetModal;
