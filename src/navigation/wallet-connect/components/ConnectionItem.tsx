import {useNavigation} from '@react-navigation/native';
import {IWalletConnectSession} from '@walletconnect/types';
import React, {useCallback, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
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
import FastImage from 'react-native-fast-image';
import {IconLabel} from '../styled/WalletConnectText';
import NestedArrow from '../../../../assets/img/nested-arrow.svg';
import styled from 'styled-components/native';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {IWCRequest} from '../../../store/wallet-connect/wallet-connect.models';
import {Wallet} from '../../../store/wallet/wallet.models';
import ConnectionSkeletonRow from './ConnectionSkeletonRow';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';

const NestedArrowContainer = styled.View`
  padding-right: 11px;
  padding-left: 7px;
`;

const Badge = styled.View`
  position: absolute;
  border-radius: 8px;
  width: 7px;
  height: 7px;
  left: 61px;
  top: 0px;
  background: #ff647c;
`;

export default ({
  session,
  wallet,
}: {
  session: IWalletConnectSession;
  wallet: Wallet;
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {peerId, peerMeta, key} = session;
  const requests: IWCRequest[] = useAppSelector(({WALLET_CONNECT}) => {
    return WALLET_CONNECT.requests.filter(request => request.peerId === peerId);
  });
  const [isLoading, setIsLoading] = useState<boolean>();

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

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
                wallet,
              },
            });
          }}>
          <NestedArrowContainer>
            <NestedArrow />
          </NestedArrowContainer>
          {isLoading ? <ConnectionSkeletonRow /> : null}
          {peerMeta && peerMeta.icons[0] ? (
            <>
              <IconContainer>
                <FastImage
                  source={{uri: peerMeta.icons[0]}}
                  style={{width: 37, height: 37}}
                  onLoadStart={() => {
                    setIsLoading(true);
                  }}
                  onLoadEnd={() => {
                    setIsLoading(false);
                  }}
                />
              </IconContainer>
              {requests.length ? <Badge /> : null}
              {!isLoading ? (
                <IconLabel>{peerMeta.url.replace('https://', '')}</IconLabel>
              ) : null}
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
                title: t('Confirm delete'),
                message: t('Are you sure you want to delete this connection?'),
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: t('DELETE'),
                    action: async () => {
                      try {
                        dispatch(dismissBottomNotificationModal());
                        await sleep(500);
                        dispatch(startOnGoingProcessModal('LOADING'));
                        dispatch(walletConnectKillSession(peerId));
                      } catch (e) {
                        await showErrorMessage(
                          CustomErrorMessage({
                            errMsg: BWCErrorMessage(e),
                            title: t('Uh oh, something went wrong'),
                          }),
                        );
                      } finally {
                        dispatch(dismissOnGoingProcessModal());
                      }
                    },
                    primary: true,
                  },
                  {
                    text: t('GO BACK'),
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
