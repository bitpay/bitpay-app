import React, {useEffect, useState, useCallback, useMemo} from 'react';
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
  const navTheme = useStyledTheme();
  const activeModalId = useAppSelector(({APP}) => APP.activeModalId);
  const [isVisibleSafe, setVisibleSafe] = useState(false);

  const allProps = useMemo(
    () =>
      ({
        ...ReactNativeModal.defaultProps,
        ...props,
      } as ModalProps & ModalPropsEx),
    [props],
  );

  const {
    id,
    isVisible,
    onModalHide,
    onModalWillShow,
    children,
    ...restModalProps
  } = allProps;

  // (iOS) if a modal is shown while another modal is not done being hidden,
  // both modals end up hidden, so make sure only 1 modal is visible at a time.
  useEffect(() => {
    const shouldBeVisible =
      isVisible && (!activeModalId || activeModalId === id);
    setVisibleSafe(prevVisible => {
      if (prevVisible !== shouldBeVisible) {
        return shouldBeVisible;
      }
      return prevVisible;
    });
  }, [activeModalId, id, isVisible]);

  const handleModalHide = useCallback(() => {
    dispatch(AppActions.activeModalUpdated(null));
    onModalHide?.();
  }, [dispatch, onModalHide]);

  const handleModalWillShow = useCallback(() => {
    dispatch(AppActions.activeModalUpdated(id));
    onModalWillShow?.();
  }, [dispatch, id, onModalWillShow]);

  const themeValue = useMemo(() => navTheme as any, [navTheme]);

  return (
    <NavigationThemeContext.Provider value={themeValue}>
      <View>
        <Modal
          isVisible={isVisibleSafe}
          onModalHide={handleModalHide}
          onModalWillShow={handleModalWillShow}
          {...restModalProps}>
          {children}
        </Modal>
      </View>
    </NavigationThemeContext.Provider>
  );
};

export default React.memo(BaseModal);
