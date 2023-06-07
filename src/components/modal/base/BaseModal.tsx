import React, {useEffect, useState} from 'react';
import {AppActions} from '../../../store/app';
import {ModalId} from '../../../store/app/app.reducer';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {TouchableOpacity} from 'react-native';

type ModalProps = {
  id: ModalId;
  isVisible: boolean;
  onModalHide?: () => void;
  onModalWillShow?: () => void;
  onBackdropPress?: () => void;
  children: React.ReactNode;
  style: any;
};

const BaseModal: React.FC<ModalProps> = props => {
  const dispatch = useAppDispatch();
  const activeModalId = useAppSelector(({APP}) => APP.activeModalId);
  const [isVisibleSafe, setVisibleSafe] = useState(false);
  const {id, isVisible, onModalHide, onModalWillShow} = props as ModalProps;

  useEffect(() => {
    if (isVisible) {
      if (!activeModalId || activeModalId === id) {
        setVisibleSafe(true);
        dispatch(AppActions.activeModalUpdated(id));
        onModalWillShow?.();
      } else {
        setVisibleSafe(false);
        dispatch(AppActions.activeModalUpdated(null));
        onModalHide?.();
      }
    } else {
      setVisibleSafe(false);
      dispatch(AppActions.activeModalUpdated(null));
      onModalHide?.();
    }
  }, [activeModalId, id, isVisible]);
  return (
    <>
      {isVisibleSafe ? (
        <TouchableOpacity
          activeOpacity={1}
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={props.onBackdropPress}>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              zIndex: isVisibleSafe ? 1000000 : undefined,
            }}>
            {props.children}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </>
  );
};

export default BaseModal;
