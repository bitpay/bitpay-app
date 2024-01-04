import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
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
import {
  walletConnectV2OnSessionProposal,
  walletConnectV2RejectSessionProposal,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import haptic from '../../../components/haptic-feedback/haptic';
import Button from '../../../components/button/Button';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {Web3WalletTypes} from '@walletconnect/web3wallet';

export type WalletConnectIntroParamList = {
  uri?: string;
};

const LinkContainer = styled.View`
  padding-top: 5px;
  padding-bottom: 30px;
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
  const {
    params: {uri: _uri},
  } = useRoute<RouteProp<{params: WalletConnectIntroParamList}>>();
  const [uri, setUri] = useState(_uri || '');

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const setProposal = async (
    proposal?: Web3WalletTypes.EventArguments['session_proposal'],
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(500);
    setDappProposal(proposal);
    showWalletSelectorV2();
  };

  useEffect(() => {
    setProposal(proposal);
  }, [proposal]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'POP') {
        if (proposal) {
          dispatch(walletConnectV2RejectSessionProposal(proposal.id));
        }
        navigation.goBack();
      }
    });
  }, [navigation]);

  const validateWalletConnectUri = async (data: string) => {
    try {
      if (isValidWalletConnectUri(data)) {
        const {version} = parseUri(data);
        if (version === 1) {
          const errMsg = t(
            'The URI corresponds to WalletConnect v1.0, which was shut down on June 28.',
          );
          throw errMsg;
        } else {
          dispatch(startOnGoingProcessModal('LOADING'));
          await dispatch(walletConnectV2OnSessionProposal(data));
          dispatch(dismissOnGoingProcessModal());
        }
      } else {
        const errMsg = t('The URI does not correspond to WalletConnect.');
        throw errMsg;
      }
    } catch (err: any) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      if (
        proposal &&
        typeof err === 'object' &&
        err !== null &&
        err.message?.includes('Pairing already exists:')
      ) {
        showWalletSelectorV2();
      } else {
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Uh oh, something went wrong'),
          }),
        );
      }
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
        <SearchContainer>
          <SearchInput
            placeholder={t('WalletConnect URI')}
            onChangeText={(text: string) => {
              setUri(text);
            }}
            value={uri}
          />
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              navigation.navigate('ScanRoot', {
                onScanComplete: (data: string) => {
                  validateWalletConnectUri(data);
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => {
            validateWalletConnectUri(uri);
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
