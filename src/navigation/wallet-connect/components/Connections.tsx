import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import React, {useCallback} from 'react';
import haptic from '../../../components/haptic-feedback/haptic';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import AddIcon from '../../../../assets/img/add.svg';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import {
  isValidWalletConnectUri,
  sleep,
  titleCasing,
} from '../../../utils/helper-methods';
import {Badge, H5, H7} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {walletConnectOnSessionRequest} from '../../../store/wallet-connect/wallet-connect.effects';

import {IWCConnector} from '../../../store/wallet-connect/wallet-connect.models';
import ConnectionItem from './ConnectionItem';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {Wallet} from '../../../store/wallet/wallet.models';

const ConnectionsContainer = styled.View`
  padding-bottom: 32px;
`;

const ChainContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
`;

const ChainDetailsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ChainIconContainer = styled.View`
  border-radius: 100px;
  height: auto;
  width: auto;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const ChainTextContainer = styled.View`
  margin-left: 8px;
  align-items: flex-start;
  flex-direction: row;
`;

const AddConnectionContainer = styled.TouchableOpacity`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  height: 43px;
  width: 80px;
  justify-content: space-around;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
`;

export default ({
  wallet,
  connectors,
}: {
  wallet: Wallet;
  connectors: IWCConnector[];
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const {name, network} = walletData;

  return (
    <ConnectionsContainer>
      <ChainContainer>
        <ChainDetailsContainer>
          <ChainIconContainer>
            <EthIcon width={37} height={37} />
          </ChainIconContainer>
          <ChainTextContainer>
            <H5>{name}</H5>
            {network ? (
              <Badge style={{marginLeft: 5}}>
                <H7>{titleCasing(network)}</H7>
              </Badge>
            ) : null}
          </ChainTextContainer>
        </ChainDetailsContainer>
        {/*<AddConnectionContainer*/}
        {/*  onPress={async () => {*/}
        {/*    haptic('impactLight');*/}
        {/*    navigation.navigate('Scan', {*/}
        {/*      screen: 'Root',*/}
        {/*      params: {*/}
        {/*        onScanComplete: async data => {*/}
        {/*          try {*/}
        {/*            dispatch(*/}
        {/*              showOnGoingProcessModal(OnGoingProcessMessages.LOADING),*/}
        {/*            );*/}
        {/*            if (isValidWalletConnectUri(data)) {*/}
        {/*              const peer = (await dispatch<any>(*/}
        {/*                walletConnectOnSessionRequest(data),*/}
        {/*              )) as any;*/}
        {/*              navigation.navigate('WalletConnect', {*/}
        {/*                screen: 'WalletConnectStart',*/}
        {/*                params: {*/}
        {/*                  keyId: customData.keyId,*/}
        {/*                  walletId: customData.walletId,*/}
        {/*                  peer,*/}
        {/*                },*/}
        {/*              });*/}
        {/*            }*/}
        {/*          } catch (e) {*/}
        {/*            await showErrorMessage(*/}
        {/*              CustomErrorMessage({*/}
        {/*                errMsg: BWCErrorMessage(e),*/}
        {/*                title: 'Uh oh, something went wrong',*/}
        {/*              }),*/}
        {/*            );*/}
        {/*          } finally {*/}
        {/*            dispatch(dismissOnGoingProcessModal());*/}
        {/*          }*/}
        {/*        },*/}
        {/*      },*/}
        {/*    });*/}
        {/*  }}>*/}
        {/*  <AddIcon width={13} />*/}
        {/*  <WalletConnectIcon width={25} />*/}
        {/*</AddConnectionContainer>*/}
      </ChainContainer>
      {Object.entries(connectors as any).map(([key, c]) => {
        return (
          <ConnectionItem
            key={key}
            session={(c as IWCConnector).connector.session}
            wallet={wallet}
          />
        );
      })}
    </ConnectionsContainer>
  );
};
