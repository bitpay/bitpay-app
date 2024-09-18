import React, {useCallback, useLayoutEffect, useState, useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Recipient,
  TxDetails,
  Wallet,
} from '../../../store/wallet/wallet.models';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {sleep} from '../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {WalletConnectGroupParamList} from '../WalletConnectGroup';
import PaymentSent from '../../wallet/components/PaymentSent';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  ExchangeRate,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
  SharedDetailRow,
} from '../../wallet/screens/send/confirm/Shared';
import {
  GetFeeOptions,
  getFeeRatePerKb,
} from '../../../store/wallet/effects/fee/fee';
import {Trans, useTranslation} from 'react-i18next';
import Banner from '../../../components/banner/Banner';
import {BaseText, H7} from '../../../components/styled/Text';
import {Hr} from '../../../components/styled/Containers';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  walletConnectV2ApproveCallRequest,
  walletConnectV2OnUpdateSession,
  walletConnectV2RejectCallRequest,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {buildTxDetails} from '../../../store/wallet/effects/send/send';
import {IconContainer, ItemContainer} from '../styled/WalletConnectContainers';
import {
  ClipboardContainer,
  NoteContainer,
  NoteLabel,
} from './WalletConnectHome';
import FastImage from 'react-native-fast-image';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import Clipboard from '@react-native-clipboard/clipboard';
import {SvgProps} from 'react-native-svg';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {Caution25, Success25, Warning25} from '../../../styles/colors';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';
import VerifyContextModal from '../../../components/modal/wallet-connect/VerifyModalContext';
import {TouchableOpacity} from 'react-native-gesture-handler';

const HeaderRightContainer = styled.View``;

const VerifyIconContainer = styled(TouchableOpacity)`
  padding: 10px;
  border-radius: 50px;
`;

export interface WalletConnectConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  peerName?: string;
  peerUrl?: string;
  icons?: string[];
  request: any;
  topic: string;
  selectedAccountAddress: string;
}

const WalletConnectConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<WalletConnectGroupParamList, 'WalletConnectConfirm'>>();
  const {
    wallet,
    request,
    peerName,
    peerUrl,
    icons,
    recipient,
    topic,
    selectedAccountAddress,
  } = route.params;
  const peerIcon = icons && icons[0];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const [showVerifyContextBottomModal, setShowVerifyContextBottomModal] =
    useState<boolean>(false);
  const [accountDisconnected, setAccountDisconnected] = useState(false);

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const [txDetails, setTxDetails] = useState<TxDetails>();

  const sessionV2: WCV2SessionType | undefined = useAppSelector(
    ({WALLET_CONNECT_V2}) =>
      WALLET_CONNECT_V2.sessions.find(session => session.topic === topic),
  );

  let VerifyIcon: React.FC<SvgProps> | null = null;
  let bgColor = '';
  switch (sessionV2?.verifyContext?.verified?.validation) {
    case 'UNKNOWN':
      bgColor = Warning25;
      VerifyIcon = WarningOutlineSvg;
      break;
    case 'VALID':
      bgColor = Success25;
      VerifyIcon = TrustedDomainSvg;
      break;
    case 'INVALID':
      bgColor = Caution25;
      VerifyIcon = InvalidDomainSvg;
      break;
  }

  const _setTxDetails = async () => {
    try {
      const feePerKb = await getFeeRatePerKb({wallet, feeLevel: 'normal'});
      const _txDetails = await dispatch(
        buildTxDetails({
          wallet,
          rates,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          recipient,
          context: 'walletConnect',
          request,
          feePerKb,
        }),
      );
      setTxDetails(_txDetails);
    } catch (err) {
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  useEffect(() => {
    _setTxDetails();
  }, []);

  const feeOptions = GetFeeOptions(wallet.chain);

  const approveCallRequest = async () => {
    try {
      dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      await dispatch(walletConnectV2ApproveCallRequest(request, wallet));
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'WalletConnect Confirm',
          coin: wallet?.currencyAbbreviation || '',
        }),
      );
      setShowPaymentSentModal(true);
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      setResetSwipeButton(true);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
          break;
        case 'password canceled':
          break;
        case 'biometric check failed':
          break;
        case 'user denied transaction':
          break;
        default:
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: t('Uh oh, something went wrong'),
            }),
          );
      }
    }
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const rejectCallRequest = useCallback(async () => {
    haptic('impactLight');
    try {
      dispatch(startOnGoingProcessModal('REJECTING_CALL_REQUEST'));
      await dispatch(walletConnectV2RejectCallRequest(request));
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      navigation.goBack();
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  }, [dispatch, navigation, request, showErrorMessage, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            onPress={rejectCallRequest}
            buttonStyle="danger"
            buttonType="pill">
            {t('Reject')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, rejectCallRequest, t]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  useEffect(() => {
    if (!clipboardObj.copied) {
      return;
    }
    const timer = setTimeout(() => {
      setClipboardObj({copied: false, type: clipboardObj.type});
    }, 3000);

    return () => clearTimeout(timer);
  }, [clipboardObj]);

  const copyToClipboard = (value: string, type: string) => {
    haptic('impactLight');
    if (!clipboardObj.copied && value) {
      Clipboard.setString(value);
      setClipboardObj({copied: true, type});

      setTimeout(() => {
        setClipboardObj({copied: false, type});
      }, 3000);
    }
  };

  const closeModal = () => {
    setShowVerifyContextBottomModal(false);
  };

  const disconnectAccount = async () => {
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm delete'),
        message: t(
          'Are you sure you want to delete this account from the connection?',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('DELETE'),
            action: async () => {
              try {
                if (sessionV2) {
                  dispatch(dismissBottomNotificationModal());
                  await sleep(600);
                  dispatch(startOnGoingProcessModal('LOADING'));
                  await sleep(600);
                  await dispatch(
                    walletConnectV2OnUpdateSession({
                      session: sessionV2,
                      address: selectedAccountAddress,
                      action: 'disconnect',
                    }),
                  );
                  dispatch(dismissOnGoingProcessModal());
                  await sleep(600);
                  setAccountDisconnected(true);
                }
              } catch (err) {
                dispatch(dismissOnGoingProcessModal());
                await sleep(500);
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
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
  };

  useEffect(() => {
    if (!sessionV2) {
      setAccountDisconnected(true);
    }
  }, [sessionV2]);

  useEffect(() => {
    if (accountDisconnected) {
      navigation.goBack();
    }
  }, [accountDisconnected]);

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <Banner
          height={100}
          type={'warning'}
          title={t('Waiting for approval')}
          transComponent={
            <Trans
              i18nKey="WalletConnectBannerConfirm"
              values={{peerName}}
              components={[<BaseText style={{fontWeight: 'bold'}} />]}
            />
          }
        />
        <Hr />
        <ItemContainer>
          <H7>{t('Connected to')}</H7>
          {peerUrl && peerIcon ? (
            <ClipboardContainer>
              {clipboardObj.copied && clipboardObj.type === 'dappUri' ? (
                <CopiedSvg width={17} />
              ) : null}
              {/* {VerifyIcon ? (
                <VerifyIconContainer
                  style={{
                    backgroundColor: bgColor,
                  }}
                  onPress={() => setShowVerifyContextBottomModal(true)}>
                  <VerifyIcon />
                </VerifyIconContainer>
              ) : null} */}
              <NoteContainer
                isDappUri={true}
                disabled={clipboardObj.copied}
                onPress={() =>
                  peerUrl ? copyToClipboard(peerUrl, 'dappUri') : null
                }>
                <IconContainer>
                  <FastImage
                    source={{uri: peerIcon}}
                    style={{width: 18, height: 18}}
                  />
                </IconContainer>
                <NoteLabel numberOfLines={1} ellipsizeMode={'tail'}>
                  {peerUrl?.replace('https://', '')}
                </NoteLabel>
              </NoteContainer>
            </ClipboardContainer>
          ) : null}
        </ItemContainer>
        <Hr />
        <SendingTo recipient={txDetails?.sendingTo} hr />
        <SendingFrom sender={txDetails?.sendingFrom} hr />
        {txDetails?.rateStr ? (
          <ExchangeRate
            description={t('Exchange Rate')}
            rateStr={txDetails?.rateStr}
          />
        ) : null}
        <Fee
          fee={txDetails?.fee}
          feeOptions={feeOptions}
          hideFeeOptions={true}
          hr
        />
        {txDetails?.gasPrice !== undefined ? (
          <SharedDetailRow
            description={t('Gas price')}
            value={txDetails?.gasPrice.toFixed(2) + ' Gwei'}
            hr
          />
        ) : null}
        {txDetails?.gasLimit !== undefined ? (
          <SharedDetailRow
            description={t('Gas limit')}
            value={txDetails?.gasLimit}
            hr
          />
        ) : null}
        {txDetails?.nonce !== undefined && txDetails?.nonce !== null ? (
          <SharedDetailRow description={'Nonce'} value={txDetails?.nonce} hr />
        ) : null}
        <Amount description={t('SubTotal')} amount={txDetails?.subTotal} />
        <Amount description={t('Total')} amount={txDetails?.total} />
      </DetailsList>
      <SwipeButton
        title={t('Slide to approve')}
        onSwipeComplete={approveCallRequest}
        forceReset={resetSwipeButton}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={() => {
          setShowPaymentSentModal(false);
          navigation.goBack();
        }}
      />

      {/* <VerifyContextModal
        isVisible={showVerifyContextBottomModal}
        closeModal={closeModal}
        sessionV2={sessionV2}
        onRemovePress={disconnectAccount}
      /> */}
    </ConfirmContainer>
  );
};

export default WalletConnectConfirm;
