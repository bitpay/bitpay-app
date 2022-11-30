import React from 'react';
import {BlurContainer} from '../../../blur/Blur';
import {SheetParams} from '../../../styled/Containers';
import BaseModal from '../BaseModal';

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
  return (
    <BaseModal
      id={'sheetModal'}
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
        <BlurContainer />
      </>
    </BaseModal>
  );
};

export default SheetModal;
