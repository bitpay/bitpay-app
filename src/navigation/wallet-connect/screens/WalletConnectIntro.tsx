import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {useAppDispatch} from '../../../utils/hooks';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {Link, Paragraph} from '../../../components/styled/Text';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {useTranslation} from 'react-i18next';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {sleep} from '../../../utils/helper-methods';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {isValidWalletConnectUri} from '../../../store/wallet/utils/validations';
import {walletConnectV2OnSessionProposal} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {parseUri} from '@walletconnect/utils';
import WCV1WalletSelector from '../components/WCV1WalletSelector';
import WCV2WalletSelector from '../components/WCV2WalletSelector';
import {SignClientTypes} from '@walletconnect/types';

export type WalletConnectIntroParamList = {
  uri?: string;
  proposal?: SignClientTypes.EventArguments['session_proposal'];
};

const LinkContainer = styled.View`
  padding-top: 5px;
  padding-bottom: 57px;
`;

const WalletConnectIntro = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{params: WalletConnectIntroParamList}>>();
  // version 1
  const {uri, proposal} = route.params || {};
  const [dappUri, setDappUri] = useState<string>();
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const showWalletSelector = () => setWalletSelectorModalVisible(true);
  const hideWalletSelector = () => setWalletSelectorModalVisible(false);

  // version 2
  const [dappProposal, setDappProposal] = useState<any>();
  const [walletSelectorV2ModalVisible, setWalletSelectorV2ModalVisible] =
    useState(false);
  const showWalletSelectorV2 = () => setWalletSelectorV2ModalVisible(true);
  const hideWalletSelectorV2 = () => setWalletSelectorV2ModalVisible(false);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  useEffect(() => {
    if (uri) {
      setDappUri(uri);
      showWalletSelector();
    }
  }, [uri]);

  useEffect(() => {
    if (proposal) {
      setDappProposal(proposal);
      showWalletSelectorV2();
    }
  }, [proposal]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        <Paragraph>
          {t(
            'WalletConnect is an open source protocol for connecting decentralized applications to mobile wallets with QR code scanning or deep linking.',
          )}
        </Paragraph>
        <LinkContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              dispatch(openUrlWithInAppBrowser('https://walletconnect.org/'));
            }}>
            <Link>{t('Learn More')}</Link>
          </TouchableOpacity>
        </LinkContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => {
            navigation.navigate('Scan', {
              screen: 'Root',
              params: {
                onScanComplete: async data => {
                  try {
                    if (isValidWalletConnectUri(data)) {
                      const {version} = parseUri(data);
                      if (version === 1) {
                        setDappUri(data);
                        showWalletSelector();
                      } else {
                        dispatch(startOnGoingProcessModal('LOADING'));
                        const _proposal = (await dispatch<any>(
                          walletConnectV2OnSessionProposal(data),
                        )) as any;
                        setDappProposal(_proposal);
                        dispatch(dismissOnGoingProcessModal());
                        await sleep(500);
                        showWalletSelectorV2();
                      }
                    }
                  } catch (e: any) {
                    setDappUri(undefined);
                    setDappProposal(undefined);
                    dispatch(dismissOnGoingProcessModal());
                    await sleep(500);
                    await showErrorMessage(
                      CustomErrorMessage({
                        errMsg: BWCErrorMessage(e),
                        title: t('Uh oh, something went wrong'),
                      }),
                    );
                  }
                },
              },
            });
          }}>
          {t('Connect')}
        </Button>
        {dappProposal ? (
          <WCV2WalletSelector
            isVisible={walletSelectorV2ModalVisible}
            proposal={dappProposal}
            onBackdropPress={hideWalletSelectorV2}
          />
        ) : null}
        {dappUri ? (
          <WCV1WalletSelector
            isVisible={walletSelectorModalVisible}
            dappUri={dappUri}
            onBackdropPress={hideWalletSelector}
          />
        ) : null}
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectIntro;
