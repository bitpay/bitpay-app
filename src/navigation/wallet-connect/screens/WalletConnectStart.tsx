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
import {useAppDispatch} from '../../../utils/hooks';
import {WalletConnectContainer} from '../styled/WalletConnectContainers';
import {View} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  ActionContainer,
  CtaContainerAbsolute,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
import {SessionTypes, SignClientTypes} from '@walletconnect/types';
import {
  walletConnectV2ApproveSessionProposal,
  walletConnectV2RejectSessionProposal,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {sessionProposal} from '../../../store/wallet-connect-v2/wallet-connect-v2.actions';

export type WalletConnectStartParamList = {
  // version 2
  proposal?: SignClientTypes.EventArguments['session_proposal'];
  selectedWallets?: {chain: string; address: string; network: string}[];
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
  const [buttonState, setButtonState] = useState<ButtonState>();
  const {
    params: {proposal, selectedWallets},
  } = useRoute<RouteProp<{params: WalletConnectStartParamList}>>();
  // version 2
  const {id, params} = proposal || {};
  const {
    proposer,
    requiredNamespaces,
    relays,
    pairingTopic,
    optionalNamespaces,
  } = params || {};
  const {metadata} = proposer || {};

  const peerName = metadata?.name;
  const peerUrl = metadata?.url;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            onPress={() => {
              haptic('impactLight');
              rejectSessionProposal();
            }}
            buttonType="pill">
            {t('Reject')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const rejectSessionProposal = () => {
    dispatch(walletConnectV2RejectSessionProposal(id!));
    navigation.dispatch(StackActions.popToTop());
  };
  const approveSessionProposal = async () => {
    try {
      setButtonState('loading');
      if (selectedWallets) {
        const namespaces: SessionTypes.Namespaces = {};
        requiredNamespaces &&
          Object.keys(requiredNamespaces).forEach(key => {
            const accounts: string[] = [];
            requiredNamespaces[key].chains?.map((chain: string) => {
              selectedWallets.forEach(selectedWallet => {
                accounts.push(`${chain}:${selectedWallet.address}`);
              });
            });
            namespaces[key] = {
              accounts: [...new Set(accounts)],
              methods: [
                ...requiredNamespaces[key].methods,
                ...(optionalNamespaces && optionalNamespaces[key]
                  ? optionalNamespaces[key]?.methods
                  : []),
              ],
              events: [
                ...requiredNamespaces[key].events,
                ...(optionalNamespaces && optionalNamespaces[key]
                  ? optionalNamespaces[key]?.events
                  : []),
              ],
            };
          });
        if (id && relays) {
          await dispatch(
            walletConnectV2ApproveSessionProposal(
              id,
              relays[0].protocol,
              namespaces,
              pairingTopic!,
            ),
          );
        }
      }
      setButtonState('success');
      dispatch(Analytics.track('WalletConnect Session Request Approved', {}));
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
      setButtonState('failed');
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(e),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'POP') {
        rejectSessionProposal();
      }
    });
  }, [navigation]);

  return (
    <WalletConnectContainer>
      <View
        style={{
          marginLeft: 16,
          marginRight: 16,
          marginTop: 16,
        }}>
        {peerName && peerUrl && (
          <View>
            <Paragraph>
              {peerName + t(' wants to connect to your wallet.')}
            </Paragraph>
            <UriContainer>
              <Paragraph>{peerUrl}</Paragraph>
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
      </View>
      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <ActionContainer>
          <Button
            state={buttonState}
            disabled={!selectedWallets}
            onPress={() => {
              haptic('impactLight');
              approveSessionProposal();
            }}>
            {t('Approve')}
          </Button>
        </ActionContainer>
      </CtaContainerAbsolute>
    </WalletConnectContainer>
  );
};

export default WalletConnectStart;
