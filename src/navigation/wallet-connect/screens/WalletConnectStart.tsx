import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
import {H6, H5, Paragraph} from '../../../components/styled/Text';
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
import {StyleSheet, View} from 'react-native';
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
import {SessionTypes} from '@walletconnect/types';
import {
  walletConnectV2ApproveSessionProposal,
  walletConnectV2RejectSessionProposal,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {buildApprovedNamespaces} from '@walletconnect/utils';
import {
  CHAIN_NAME_MAPPING,
  EIP155_SIGNING_METHODS,
} from '../../../constants/WalletConnectV2';
import {Web3WalletTypes} from '@walletconnect/web3wallet';
import FastImage from 'react-native-fast-image';

export type WalletConnectStartParamList = {
  // version 2
  proposal: Web3WalletTypes.EventArguments['session_proposal'];
  selectedWallets?: {
    chain: string;
    address: string;
    network: string;
    supportedChain: string;
  }[];
};

const UriContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 6px;
  height: 64px;
  margin-bottom: 35px;
  justify-content: center;
  align-items: center;
`;

const TitleContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const DescriptionContainer = styled.View`
  margin-bottom: 50px;
`;

const DescriptionItemContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin: 10px 10px;
`;

const DescriptionItem = styled(Paragraph)`
  padding-left: 9px;
  padding-top: 2px;
  color: ${props => props.theme.colors.text};
`;

const IconContainer = styled.View`
  width: 100%;
  justify-content: center;
  align-items: center;
`;

const styles = StyleSheet.create({
  icon: {
    height: 80,
    width: 80,
    borderRadius: 10,
  },
});

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
  const {proposer, relays, pairingTopic} = params || {};
  const {metadata} = proposer || {};

  const peerName = metadata?.name;
  const peerUrl = metadata?.url;
  const peerImg = metadata?.icons?.[0];

  useLayoutEffect(() => {
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

  const transformErrorMessage = (error: string) => {
    const NETWORK_ERROR_PREFIX =
      "Non conforming namespaces. approve() namespaces chains don't satisfy required namespaces.";

    if (error.includes(NETWORK_ERROR_PREFIX)) {
      // Replace chain codes with corresponding chain names
      error = error.replace(/eip155:\d+/g, match => {
        const chainCode = match.split(':')[1];
        return CHAIN_NAME_MAPPING[chainCode] || match;
      });
      let parts = error.split('Required: ')[1].split('Approved: ');
      let requiredPart = parts[0].replace(/,/g, ', ');
      let approvedPart = parts[1].replace(/,/g, ', ');
      const transformedMessage = `Network compatibility issue. The supported networks do not meet the requirements.\n\nRequired Networks:\n${requiredPart}\n\nSupported Networks:\n${approvedPart}`;
      return transformedMessage;
    } else {
      return error;
    }
  };

  const rejectSessionProposal = () => {
    dispatch(walletConnectV2RejectSessionProposal(id!));
    navigation.dispatch(StackActions.popToTop());
  };
  const approveSessionProposal = async () => {
    try {
      setButtonState('loading');
      if (selectedWallets) {
        const accounts: string[] = [];
        const chains: string[] = [];
        selectedWallets.forEach(selectedWallet => {
          accounts.push(
            `${selectedWallet.supportedChain}:${selectedWallet.address}`,
          );
          chains.push(selectedWallet.supportedChain);
        });
        // Remove duplicate values from chains array
        const uniqueChains = [...new Set(chains)];
        const namespaces: SessionTypes.Namespaces = buildApprovedNamespaces({
          proposal: params,
          supportedNamespaces: {
            eip155: {
              chains,
              methods: Object.values(EIP155_SIGNING_METHODS),
              events: ['chainChanged', 'accountsChanged'],
              accounts,
            },
          },
        });
        if (id && relays) {
          await dispatch(
            walletConnectV2ApproveSessionProposal(
              id,
              relays[0].protocol,
              namespaces,
              pairingTopic!,
              proposal.params,
              accounts,
              uniqueChains,
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
                  StackActions.replace('WalletConnectConnections'),
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
      const transformedMessage = transformErrorMessage(BWCErrorMessage(e));
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: transformedMessage,
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
      {peerImg ? (
        <IconContainer>
          <FastImage
            style={styles.icon}
            source={{
              uri: peerImg,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.cover}
          />
        </IconContainer>
      ) : null}
      <View
        style={{
          marginLeft: 16,
          marginRight: 16,
          marginTop: 16,
        }}>
        {peerName && peerUrl && (
          <View>
            <TitleContainer>
              <H5>{peerName + t(' wants to connect')}</H5>
            </TitleContainer>
            <UriContainer>
              <Paragraph>{peerUrl}</Paragraph>
            </UriContainer>
            <DescriptionContainer>
              <H6>{t('Required permissions')}</H6>
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
