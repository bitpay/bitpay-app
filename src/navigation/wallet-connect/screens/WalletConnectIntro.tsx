import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
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
import {isValidWalletConnectUri} from '../../../store/wallet/utils/validations';
import {parseUri} from '@walletconnect/utils';
import WCV2WalletSelector from '../components/WCV2WalletSelector';
import {walletConnectV2OnSessionProposal} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {SignClientTypes} from '@walletconnect/types';
import haptic from '../../../components/haptic-feedback/haptic';
import Button from '../../../components/button/Button';

export type WalletConnectIntroParamList = {};

const LinkContainer = styled.View`
  padding-top: 5px;
  padding-bottom: 57px;
`;

const WalletConnectIntro = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  // version 2
  const {proposal} = useAppSelector(({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2);
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

  const setProposal = async (
    proposal?: SignClientTypes.EventArguments['session_proposal'],
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(500);
    setDappProposal(proposal);
    showWalletSelectorV2();
  };

  useEffect(() => {
    setProposal(proposal);
  }, [proposal]);

  const validateWalletConnectUri = async (data: string) => {
    if (isValidWalletConnectUri(data)) {
      const {version} = parseUri(data);
      if (version === 1) {
        const errMsg = t(
          'The URI corresponds to WalletConnect v1.0, which was shut down on June 28.',
        );
        await showErrorMessage(
          CustomErrorMessage({
            errMsg,
            title: t('Uh oh, something went wrong'),
          }),
        );
      } else {
        dispatch(startOnGoingProcessModal('LOADING'));
        dispatch(walletConnectV2OnSessionProposal(data));
      }
    } else {
      const errMsg = t(
        'The scanned QR code does not correspond to WalletConnect.',
      );
      await showErrorMessage(
        CustomErrorMessage({
          errMsg,
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

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
                onScanComplete: (data: string) => {
                  validateWalletConnectUri(data);
                },
              },
            });
          }}>
          {t('Connect')}
        </Button>
      </ScrollView>
      {dappProposal ? (
        <WCV2WalletSelector
          isVisible={walletSelectorV2ModalVisible}
          proposal={dappProposal}
          onBackdropPress={hideWalletSelectorV2}
        />
      ) : null}
    </WalletConnectContainer>
  );
};

export default WalletConnectIntro;
