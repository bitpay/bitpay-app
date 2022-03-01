import {useNavigation} from '@react-navigation/native';
import {IWalletConnectSession} from '@walletconnect/types';
import React from 'react';
import {useDispatch} from 'react-redux';
import haptic from '../../../components/haptic-feedback/haptic';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {walletConnectKillSession} from '../../../store/wallet-connect/wallet-connect.effects';
import {sleep} from '../../../utils/helper-methods';
import {
  ItemContainer,
  ItemNoteTouchableContainer,
  ItemTitleTouchableContainer,
  IconContainer,
} from '../styled/WalletConnectContainers';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import {Image} from 'react-native';
import {IconLabel} from '../styled/WalletConnectText';
import DownRightArrow from '../../../../assets/img/wallet-connect/down-right-arrow.svg';
import styled from 'styled-components/native';

const ArrowContainer = styled.View`
  padding-right: 11px;
  padding-left: 7px;
`;

export default ({session}: {session: IWalletConnectSession}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {peerId, peerMeta, key} = session;

  return (
    <>
      <ItemContainer key={key} style={{minHeight: 37, marginTop: 16}}>
        <ItemTitleTouchableContainer
          onPress={async () => {
            haptic('impactLight');
            navigation.navigate('WalletConnect', {
              screen: 'WalletConnectHome',
              params: {
                peerId,
              },
            });
          }}>
          <ArrowContainer>
            <DownRightArrow />
          </ArrowContainer>
          {peerMeta && peerMeta.icons[0] ? (
            <>
              <IconContainer>
                <Image
                  source={{uri: peerMeta.icons[0]}}
                  style={{width: 37, height: 37}}
                />
              </IconContainer>
              <IconLabel>{peerMeta.url.replace('https://', '')}</IconLabel>
            </>
          ) : null}
        </ItemTitleTouchableContainer>
        <ItemNoteTouchableContainer
          style={{paddingRight: 10}}
          onPress={() => {
            haptic('impactLight');
            dispatch(
              showBottomNotificationModal({
                type: 'question',
                title: 'Confirm Delete',
                message: 'Are you sure you want to delete this connection?',
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'DELETE',
                    action: async () => {
                      try {
                        dispatch(dismissBottomNotificationModal());
                        await sleep(500);
                        dispatch(
                          showOnGoingProcessModal(
                            OnGoingProcessMessages.LOADING,
                          ),
                        );
                        dispatch(walletConnectKillSession(peerId));
                      } catch (e) {
                        console.log(e);
                      } finally {
                        dispatch(dismissOnGoingProcessModal());
                      }
                    },
                    primary: true,
                  },
                  {
                    text: 'GO BACK',
                    action: () => {},
                  },
                ],
              }),
            );
          }}>
          <TrashIcon />
        </ItemNoteTouchableContainer>
      </ItemContainer>
    </>
  );
};
