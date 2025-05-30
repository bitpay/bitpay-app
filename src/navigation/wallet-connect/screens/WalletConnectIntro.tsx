import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
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
import {walletConnectV2OnSessionProposal} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import haptic from '../../../components/haptic-feedback/haptic';
import Button from '../../../components/button/Button';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {NeutralSlate} from '../../../styles/colors';

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
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  // version 2
  const {proposal} = useAppSelector(({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2);
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
        typeof err === 'object' &&
        err !== null &&
        err.message?.includes('Pairing already exists:')
      ) {
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              errMsg: t(
                'Pairing is already established, but the session request failed to complete. Please try reloading the website to refresh the QR code and reconnect.',
              ),
              title: t('Uh oh, something went wrong'),
            }),
          ),
        );
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
            placeholderTextColor={placeHolderTextColor}
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
            setUri('');
          }}>
          {t('Connect')}
        </Button>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectIntro;
