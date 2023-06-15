import React from 'react';
import {SheetParams} from '../../../styled/Containers';
import BaseModal from '../BaseModal';

interface Props extends SheetParams {
  isVisible: boolean;
  onBackdropPress: (props?: any) => void;
  children: any;
  useMaxHeight?: string;
}

const SheetModal: React.FC<Props> = ({
  children,
  isVisible,
  onBackdropPress,
  placement,
  fullScreen,
  useMaxHeight,
}) => {
  return (
    <BaseModal
      id={'sheetModal'}
      isVisible={isVisible}
      onBackdropPress={onBackdropPress}
      placement={placement}
      fullScreen={fullScreen}
      useMaxHeight={useMaxHeight}>
      {children}
    </BaseModal>
  );
};

export default SheetModal;
