import React from 'react';
import styled from 'styled-components/native';
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
import {useTheme} from '@react-navigation/native';

export type InAppNotificationMessages = 'NEW_PENDING_REQUEST';

const InAppContainer = styled(TouchableOpacity)`
  justify-content: center;
  align-items: center;
`;

const Row = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Action)};
  border-radius: 10px;
  flex-direction: row;
  padding: 15px;
  width: ${WIDTH * 0.9}px;
`;

const WalletConnectIconContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  transform: scale(1.1);
`;

const Message = styled(BaseText)`
  font-weight: 700;
  flex-wrap: wrap;
  color: white;
  margin-right: 15px;
`;

const CloseModalContainer = styled.View`
  flex: 1;
  justify-content: flex-end;
  align-items: flex-end;
`;
const CloseModalButton = styled(TouchableOpacity)``;

const MessageContainer = styled.View`
  flex-direction: row;
`;

const InAppNotification: React.FC = () => {
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

  const onBackdropPress = () => {
    haptic('impactLight');
    dispatch(dismissInAppNotification());
  };

  const goToNextView = () => {
    if (context === 'notification') {
      goToWalletConnectRequestDetails();
    }
  };

  const goToWalletConnectRequestDetails = async () => {
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
  };

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
      style={{
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: insets.top,
      }}
      onBackdropPress={onBackdropPress}>
      <InAppContainer onPress={goToNextView} activeOpacity={1}>
        <Row>
          <MessageContainer>
            {context === 'notification' ? (
              <WalletConnectIconContainer>
                <WalletConnectIcon width={20} height={20} />
              </WalletConnectIconContainer>
            ) : null}
            <Message>{message}</Message>
          </MessageContainer>
          <CloseModalContainer>
            <CloseModalButton onPress={onBackdropPress}>
              <CloseModal
                {...{
                  width: 20,
                  height: 20,
                  color: White,
                }}
              />
            </CloseModalButton>
          </CloseModalContainer>
          <BlurContainer />
        </Row>
      </InAppContainer>
    </BaseModal>
  );
};

export default InAppNotification;
