import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import Modal, {ModalProps, ReactNativeModal} from 'react-native-modal';
import {AppActions} from '../../../store/app';
import {ModalId} from '../../../store/app/app.reducer';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {ThemeContext as NavigationThemeContext} from '@react-navigation/native';
import {useTheme as useStyledTheme} from 'styled-components/native';

type ModalPropsEx = {
  id: ModalId;
};

type BaseModalProps = Partial<ModalProps> & ModalPropsEx;

const BaseModal: React.FC<BaseModalProps> = props => {
  const dispatch = useAppDispatch();
  const activeModalId = useAppSelector(({APP}) => APP.activeModalId);
  const [isVisibleSafe, setVisibleSafe] = useState(false);

  const allProps = {
    ...ReactNativeModal.defaultProps,
    ...props,
  } as ModalProps & ModalPropsEx;

  const {id, isVisible, onModalHide, onModalWillShow, children, ...restModalProps} =
    allProps;

  // (iOS) if a modal is shown while another modal is not done being hidden,
  // both modals end up hidden, so make sure only 1 modal is visible at a time.
  useEffect(() => {
    if (isVisible) {
      if (!activeModalId || activeModalId === id) {
        setVisibleSafe(true);
      } else {
        setVisibleSafe(false);
      }
    } else {
      setVisibleSafe(false);
    }
  }, [activeModalId, id, isVisible]);

  const navTheme = useStyledTheme();

  return (
    <NavigationThemeContext.Provider value={navTheme as any}>
      <View>
        <Modal
          isVisible={isVisibleSafe}
          onModalHide={() => {
            dispatch(AppActions.activeModalUpdated(null));
            onModalHide?.();
          }}
          onModalWillShow={() => {
            dispatch(AppActions.activeModalUpdated(id));
            onModalWillShow?.();
          }}
          {...restModalProps}>
          {children}
        </Modal>
      </View>
    </NavigationThemeContext.Provider>
  );
};

export default BaseModal;
