import React, {useEffect} from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {Paragraph} from '../../../components/styled/Text';
import VerifiedIcon from '../../../../assets/img/wallet-connect/verified-icon.svg';
import WalletIcon from '../../../../assets/img/wallet-connect/wallet-icon.svg';
import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch, useSelector} from 'react-redux';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {RootState} from '../../../store';
import {View} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  walletConnectApproveSessionRequest,
  walletConnectRejectSessionRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {Network} from '../../../constants';
import {Currencies} from '../../../constants/currencies';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {IWCCustomData} from '../../../store/wallet-connect/wallet-connect.models';

export type WalletConnectStartParamList = {
  keyId: string | undefined;
  walletId: string | undefined;
  peer: any;
};

const CHAIN_ID: {[key in string]: any} = {
  ETH: {
    [Network.mainnet]: 1,
    [Network.testnet]: 42,
  },
};

const UriContainer = styled.View`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 6px;
  height: 64px;
  margin-top: 25px;
  margin-bottom: 35px;
  justify-content: center;
  align-items: center;
`;

const DescriptionContainer = styled.View`
  margin-bottom: 50px;
`;

const DescriptionItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;

const DescriptionItem = styled(Paragraph)`
  padding-left: 9px;
  padding-top: 2px;
  color: ${props => props.theme.colors.text};
`;

const WalletConnectStart = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {
    params: {walletId, keyId, peer},
  } = useRoute<RouteProp<{params: WalletConnectStartParamList}>>();
  const {peerId, peerMeta} = peer;

  const wallet = useSelector(
    ({WALLET}: RootState) =>
      keyId && walletId && findWalletById(WALLET.keys[keyId].wallets, walletId),
  ) as Wallet;

  const approveSessionRequest = async () => {
    try {
      haptic('impactLight');
      dispatch(showOnGoingProcessModal(OnGoingProcessMessages.LOADING));

      if (!wallet.receiveAddress) {
        throw 'MISSING_WALLET_ADDRESS';
      }

      const {chain} = Currencies[wallet.currencyAbbreviation];
      const chainId = CHAIN_ID[chain][wallet.credentials.network];
      const accounts = [wallet.receiveAddress];
      const customData: IWCCustomData = {
        keyId: wallet.keyId,
        walletId: wallet.id,
      };

      await dispatch(
        walletConnectApproveSessionRequest(
          peerId,
          {
            accounts,
            chainId,
          },
          customData,
        ),
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(800);
      dispatch(
        showBottomNotificationModal({
          type: 'success',
          title: 'Connected',
          message: 'You can now return to your browser.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'GOT IT',
              action: () => {
                navigation.dispatch(
                  StackActions.replace('WalletConnect', {
                    screen: 'WalletConnectConnections',
                  }),
                );
                dispatch(dismissBottomNotificationModal());
              },
              primary: true,
            },
          ],
        }),
      );
    } catch (e) {
      if (e === 'MISSING_WALLET_ADDRESS') {
        try {
          await dispatch<any>(createWalletAddress({wallet}));
          approveSessionRequest();
        } catch (error) {
          console.log(error);
        }
      } else {
        dispatch(dismissOnGoingProcessModal());
        // TODO: show error msg
        console.log(e);
      }
    }
  };

  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'POP') {
        dispatch(walletConnectRejectSessionRequest(peerId));
      }
    });
  }, [navigation, dispatch, peerId]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        {peerMeta && (
          <View>
            <Paragraph>
              {peerMeta?.name} wants to connect to your wallet.
            </Paragraph>
            <UriContainer>
              <Paragraph>{peerMeta?.url}</Paragraph>
            </UriContainer>
            <DescriptionContainer>
              <DescriptionItemContainer>
                <WalletIcon />
                <DescriptionItem>
                  View your wallet balance and activity.
                </DescriptionItem>
              </DescriptionItemContainer>
              <DescriptionItemContainer>
                <VerifiedIcon />
                <DescriptionItem>
                  Request approval for transactions.
                </DescriptionItem>
              </DescriptionItemContainer>
            </DescriptionContainer>
          </View>
        )}
        <Button
          disabled={!peerMeta}
          buttonStyle={'primary'}
          onPress={() => approveSessionRequest()}>
          Connect
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectStart;
