import React, {useCallback, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {Action, Black, LightBlack, White} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BlurContainer} from '../../blur/Blur';
import {BaseText} from '../../styled/Text';
import BaseModal from '../base/BaseModal';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {dismissInAppNotification} from '../../../store/app/app.actions';
import haptic from '../../haptic-feedback/haptic';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import {WIDTH} from '../../styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {getGasWalletByRequest} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {sleep} from '../../../utils/helper-methods';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../contexts';
import {ViewStyle} from 'react-native';

export type InAppNotificationMessages = 'NEW_PENDING_REQUEST';

const styles = StyleSheet.create({
  inAppContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    borderRadius: 10,
    flexDirection: 'row',
    padding: 15,
    width: WIDTH * 0.9,
  },
  walletConnectIconContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    transform: [{scale: 1.1}],
  },
  message: {
    fontWeight: '700',
    flexWrap: 'wrap',
    color: 'white',
    marginRight: 15,
  },
  closeModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  messageContainer: {
    flexDirection: 'row',
  },
});

const InAppNotificationContent: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isVisible = useAppSelector(({APP}) => APP.showInAppNotification);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const inAppNotificationData = useAppSelector(
    ({APP}) => APP.inAppNotificationData,
  );
  const theme = useTheme();
  const {context, message, request} = inAppNotificationData || {};

  const onBackdropPress = useCallback(() => {
    haptic('impactLight');
    dispatch(dismissInAppNotification());
  }, [dispatch]);

  const goToWalletConnectRequestDetails = useCallback(async () => {
    haptic('impactLight');
    dispatch(dismissInAppNotification());

    await sleep(0);

    const wallet = request && dispatch(getGasWalletByRequest(request));
    if (!wallet || !wallet.receiveAddress) {
      return;
    }

    navigation.navigate('WalletConnectHome', {
      topic: request?.topic,
      selectedAccountAddress: wallet.receiveAddress,
      notificationRequestId: request.id,
      keyId: wallet.keyId,
      context: 'notification',
    });
  }, [dispatch, navigation, request]);

  const goToNextView = useCallback(() => {
    if (context === 'notification') {
      goToWalletConnectRequestDetails();
    }
  }, [context, goToWalletConnectRequestDetails]);

  const modalStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      marginTop: insets.top,
    }),
    [insets.top],
  );

  const closeModalIconProps = useMemo(
    () => ({
      width: 20,
      height: 20,
      color: White,
    }),
    [],
  );

  const walletConnectIcon = useMemo(
    () =>
      context === 'notification' ? (
        <View style={styles.walletConnectIconContainer}>
          <WalletConnectIcon width={20} height={20} />
        </View>
      ) : null,
    [context],
  );

  return (
    <BaseModal
      id={'inAppNotification'}
      isVisible={appWasInit && isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInDown'}
      animationOut={'fadeOutUp'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={modalStyle}
      onBackdropPress={onBackdropPress}>
      <TouchableOpacity
        style={styles.inAppContainer}
        onPress={goToNextView}
        activeOpacity={1}>
        <View
          style={[
            styles.row,
            {backgroundColor: theme.dark ? LightBlack : Action},
          ]}>
          <View style={styles.messageContainer}>
            {walletConnectIcon}
            <BaseText style={styles.message}>{message}</BaseText>
          </View>
          <View style={styles.closeModalContainer}>
            <TouchableOpacity onPress={onBackdropPress}>
              <CloseModal {...closeModalIconProps} />
            </TouchableOpacity>
          </View>
          <BlurContainer />
        </View>
      </TouchableOpacity>
    </BaseModal>
  );
});

const InAppNotification: React.FC = React.memo(() => {
  const isVisible = useAppSelector(({APP}) => APP.showInAppNotification);
  const hasMountedRef = useRef(false);

  if (isVisible) {
    hasMountedRef.current = true;
  }

  return hasMountedRef.current ? <InAppNotificationContent /> : null;
});

export default InAppNotification;
