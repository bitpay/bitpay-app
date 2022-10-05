import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
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
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {View} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  walletConnectApproveSessionRequest,
  walletConnectRejectSessionRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Network} from '../../../constants';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {IWCCustomData} from '../../../store/wallet-connect/wallet-connect.models';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {useTranslation} from 'react-i18next';
import {logSegmentEvent} from '../../../store/app/app.effects';

export type WalletConnectStartParamList = {
  keyId: string | undefined;
  walletId: string | undefined;
  peer: any;
};

const CHAIN_ID: {[key in string]: any} = {
  eth: {
    [Network.mainnet]: 1,
    [Network.testnet]: 42,
  },
  matic: {
    [Network.mainnet]: 137,
    [Network.testnet]: 80001,
  },
};

const UriContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
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
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [retryCount, setRetryCount] = useState(0);
  const {
    params: {walletId, keyId, peer},
  } = useRoute<RouteProp<{params: WalletConnectStartParamList}>>();
  const {peerId, peerMeta} = peer;

  const wallet = useAppSelector(
    ({WALLET}) =>
      keyId && walletId && findWalletById(WALLET.keys[keyId].wallets, walletId),
  ) as Wallet;
  const [address, setAddress] = useState(wallet.receiveAddress);
  const [buttonState, setButtonState] = useState<ButtonState>();

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const approveSessionRequest = useCallback(async () => {
    try {
      setButtonState('loading');
      if (!address) {
        throw 'MISSING_WALLET_ADDRESS';
      }

      const {chain} = BitpaySupportedCoins[wallet.currencyAbbreviation];
      const chainId = CHAIN_ID[chain.toLowerCase()][wallet.network];
      const accounts = [address];
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
      setButtonState('success');
      dispatch(
        logSegmentEvent('track', 'WalletConnect Session Request Approved', {}),
      );
      dispatch(
        showBottomNotificationModal({
          type: 'success',
          title: t('Connected'),
          message: t('You can now return to your browser.'),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('GOT IT'),
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
          if (retryCount < 3) {
            const walletAddress = (await dispatch<any>(
              createWalletAddress({wallet}),
            )) as string;
            setAddress(walletAddress);
            setRetryCount(r => r + 1);
          } else {
            throw t('Failed to create wallet address');
          }
        } catch (error) {
          setButtonState('failed');
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(error),
              title: t('Uh oh, something went wrong'),
            }),
          );
        }
      } else {
        setButtonState('failed');
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Uh oh, something went wrong'),
          }),
        );
      }
    }
  }, [
    address,
    dispatch,
    navigation,
    peerId,
    retryCount,
    showErrorMessage,
    wallet,
    t,
  ]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'POP') {
        dispatch(walletConnectRejectSessionRequest(peerId));
      }
    });
  }, [navigation, dispatch, peerId]);

  useEffect(() => {
    if (retryCount > 0) {
      approveSessionRequest();
    }
  }, [retryCount, approveSessionRequest]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        {peerMeta && (
          <View>
            <Paragraph>
              {peerMeta?.name + t(' wants to connect to your wallet.')}
            </Paragraph>
            <UriContainer>
              <Paragraph>{peerMeta?.url}</Paragraph>
            </UriContainer>
            <DescriptionContainer>
              <DescriptionItemContainer>
                <WalletIcon />
                <DescriptionItem>
                  {t('View your wallet balance and activity.')}
                </DescriptionItem>
              </DescriptionItemContainer>
              <DescriptionItemContainer>
                <VerifiedIcon />
                <DescriptionItem>
                  {t('Request approval for transactions.')}
                </DescriptionItem>
              </DescriptionItemContainer>
            </DescriptionContainer>
          </View>
        )}
        <Button
          state={buttonState}
          disabled={!peerMeta}
          buttonStyle={'primary'}
          onPress={() => {
            haptic('impactLight');
            approveSessionRequest();
          }}>
          {t('Connect')}
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectStart;
