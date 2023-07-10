import React from 'react';
import styled from 'styled-components/native';
import {Action, LightBlack} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BlurContainer} from '../../blur/Blur';
import {BaseText} from '../../styled/Text';
import BaseModal from '../base/BaseModal';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from 'styled-components';
import {dismissInAppNotification} from '../../../store/app/app.actions';
import haptic from '../../haptic-feedback/haptic';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import {WIDTH} from '../../styled/Containers';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {EIP155_CHAINS} from '../../../constants/WalletConnectV2';
import {findWalletByAddress} from '../../../store/wallet/utils/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';

export type InAppNotificationMessages = 'NEW_PENDING_REQUEST';

const InAppContainer = styled.TouchableOpacity`
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
const CloseModalButton = styled.TouchableOpacity``;

const MessageContainer = styled.View`
  flex-direction: row;
`;

const InAppNotification: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isVisible = useAppSelector(({APP}) => APP.showInAppNotification);
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const inAppNotificationData = useAppSelector(
    ({APP}) => APP.inAppNotificationData,
  );
  const {context, message, request} = inAppNotificationData || {};

  const sessionV2: WCV2SessionType | undefined = useAppSelector(
    ({WALLET_CONNECT_V2}) =>
      WALLET_CONNECT_V2.sessions.find(
        session => session.topic === request?.topic,
      ),
  );
  const {namespaces} = sessionV2 || {};

  const onBackdropPress = () => {
    haptic('impactLight');
    dispatch(dismissInAppNotification());
  };

  const goToNextView = () => {
    if (context === 'walletconnect') {
      goToWalletConnectRequestDetails();
    }
  };

  const getWallet = (): Wallet | undefined => {
    let wallet: Wallet | undefined;
    for (const key in namespaces) {
      if (namespaces.hasOwnProperty(key)) {
        const {accounts} = namespaces[key];
        accounts.forEach(account => {
          const index = account.indexOf(':', account.indexOf(':') + 1);
          const address = account.substring(index + 1);
          const chain =
            request?.params.chainId &&
            EIP155_CHAINS[request.params.chainId]?.chainName;
          const network =
            request?.params.chainId &&
            EIP155_CHAINS[request.params.chainId]?.network;
          wallet = findWalletByAddress(address, chain, network, keys);
          if (wallet) {
            return wallet;
          }
        });
      }
    }
    return wallet;
  };

  const goToWalletConnectRequestDetails = () => {
    haptic('impactLight');
    dispatch(dismissInAppNotification());

    const wallet = getWallet();
    if (!wallet) {
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Settings'},
          },
          {
            name: 'WalletConnect',
            params: {
              screen: 'WalletConnectConnections',
            },
          },
          {
            name: 'WalletConnect',
            params: {
              screen: 'WalletConnectHome',
              params: {
                topic: request?.topic,
                wallet,
              },
            },
          },
        ],
      }),
    );
  };

  return (
    <BaseModal
      id={'inAppNotification'}
      isVisible={appWasInit && isVisible}
      backdropOpacity={theme.dark ? 0.8 : 0.6}
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
      <InAppContainer onPress={goToNextView}>
        <Row>
          <MessageContainer>
            {context === 'walletconnect' ? (
              <WalletConnectIconContainer>
                <WalletConnectIcon width={20} height={20} />
              </WalletConnectIconContainer>
            ) : null}
            <Message>{message}</Message>
          </MessageContainer>
          <CloseModalContainer>
            <CloseModalButton onPress={onBackdropPress}>
              <CloseModal width={20} height={20} />
            </CloseModalButton>
          </CloseModalContainer>
          <BlurContainer />
        </Row>
      </InAppContainer>
    </BaseModal>
  );
};

export default InAppNotification;
